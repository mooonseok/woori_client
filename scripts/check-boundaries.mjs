import { readdir, readFile } from "node:fs/promises";
import { resolve, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(repo, "apps/web/package.json"));
const ts = require("typescript");
const layers = ["atoms", "molecules", "organisms", "templates"];
const baseLayers = [
  "dto",
  "constants",
  "content",
  "utils",
  "services",
  "hooks",
];
const normalized = (value) => value.split(sep).join("/");
const viewFile = (file) =>
  /-view\.tsx?$/.test(file) || /^components\/(atoms|molecules)\//.test(file);

function dependencyProblem(from, to) {
  const [source, part] = from.split("/");
  const [target, targetPart] = to.split("/");
  if (source === "dto" && !["dto", "constants"].includes(target))
    return "DTO may only depend on DTO/constants types";
  if (source === "constants" && !["constants", "dto"].includes(target))
    return "constants cannot depend on application layers";
  if (source === "content" && !["content", "dto", "constants"].includes(target))
    return "content may only depend on data types/constants";
  if (source === "utils" && !["utils", "dto", "constants"].includes(target))
    return "utils must remain independent of side effects/UI";
  if (
    source === "services" &&
    ["hooks", "app", "sections", "components"].includes(target)
  )
    return "services cannot depend on hooks/UI";
  if (
    baseLayers.includes(source) &&
    ["app", "sections", "components"].includes(target)
  )
    return `${source} cannot depend on UI`;
  if (source === "components" && ["app", "sections"].includes(target))
    return "shared components cannot import routes/sections";
  if (
    source === "components" &&
    target === "components" &&
    layers.indexOf(targetPart) > layers.indexOf(part)
  )
    return `${part} cannot import ${targetPart}`;
  if (source === "sections" && target === "app")
    return "sections cannot import routes";
  if (source === "sections" && target === "sections" && part !== targetPart)
    return "sections cannot import another section";
  if (viewFile(from) && ["hooks", "services", "content"].includes(target))
    return "presentational files cannot import hooks/services/content";
  return null;
}

export function inspectSource(file, code) {
  const source = ts.createSourceFile(
    file,
    code,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const errors = [];
  const hookNames = new Set();
  const factoryNames = new Set(["createElement"]);
  const report = (node, message) =>
    errors.push(
      `${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: ${message}`,
    );
  const root = file.split("/")[0];
  const atoms = file.startsWith("components/atoms/");
  const layout = file === "app/layout.tsx";
  function checkImport(node, value) {
    const target = value.startsWith("@/")
      ? value.slice(2)
      : value.startsWith(".")
        ? normalized(relative(repo, resolve(repo, dirname(file), value)))
        : null;
    if (target) {
      if (target.startsWith(".."))
        report(node, "imports outside the application source root");
      const problem = dependencyProblem(file, target);
      if (problem) report(node, `${problem}: ${value}`);
    }
    if (
      root === "utils" &&
      ["react", "react-dom", "next/navigation"].includes(value)
    )
      report(node, "utils cannot import React or browser navigation");
    if (viewFile(file) && value === "react") {
      const imports = node.importClause?.namedBindings;
      if (imports && ts.isNamedImports(imports))
        for (const binding of imports.elements) {
          if (/^use[A-Z]/.test((binding.propertyName ?? binding.name).text))
            hookNames.add(binding.name.text);
        }
    }
  }
  function raw(node, name) {
    if (
      !atoms &&
      /^[a-z]/.test(name) &&
      !(layout && ["html", "body"].includes(name))
    )
      report(node, `raw <${name}> belongs in components/atoms`);
  }
  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      checkImport(statement, statement.moduleSpecifier.text);
      const clause = statement.importClause;
      if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings))
        for (const binding of clause.namedBindings.elements) {
          if ((binding.propertyName ?? binding.name).text === "createElement")
            factoryNames.add(binding.name.text);
        }
      if (root === "dto" && clause && !clause.isTypeOnly) {
        const onlyTypeBindings =
          clause.namedBindings &&
          ts.isNamedImports(clause.namedBindings) &&
          clause.namedBindings.elements.every((binding) => binding.isTypeOnly);
        if (!onlyTypeBindings)
          report(statement, "DTO imports must be type-only");
      }
    } else if (
      root === "dto" &&
      !ts.isInterfaceDeclaration(statement) &&
      !ts.isTypeAliasDeclaration(statement) &&
      !ts.isEmptyStatement(statement) &&
      !(ts.isExportDeclaration(statement) && statement.isTypeOnly)
    ) {
      report(statement, "DTO files contain types only");
    }
  }
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      raw(node, node.tagName.getText(source));
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(source);
      if (
        viewFile(file) &&
        (/^(?:React\.)?use[A-Z]/.test(name) || hookNames.has(name))
      )
        report(node, "presentational files cannot call React hooks");
      if (
        (name === "React.createElement" || factoryNames.has(name)) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        raw(node, node.arguments[0].text);
      if (
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          name === "require") &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      )
        checkImport(node, node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return errors;
}
async function filesAt(path) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const results = await Promise.all(
    entries.map(async (entry) => {
      const next = resolve(path, entry.name);
      if (entry.isDirectory()) return filesAt(next);
      return /\.[jt]sx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")
        ? [next]
        : [];
    }),
  );
  return results.flat();
}
export async function checkBoundaries() {
  const errors = [];
  let count = 0;
  for (const application of ["web", "admin"]) {
    const sourceRoot = resolve(repo, "apps", application, "src");
    for (const path of await filesAt(sourceRoot)) {
      count++;
      const file = normalized(relative(sourceRoot, path));
      errors.push(
        ...inspectSource(file, await readFile(path, "utf8")).map(
          (message) => `apps/${application}/src/${message}`,
        ),
      );
    }
  }
  if (errors.length) {
    process.stderr.write(`${errors.join("\n")}\n`);
    return false;
  }
  process.stdout.write(
    `Architecture boundaries passed (${count} source files).\n`,
  );
  return true;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (!(await checkBoundaries())) process.exitCode = 1;
}
