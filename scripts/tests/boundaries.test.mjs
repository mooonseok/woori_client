import test from "node:test";
import assert from "node:assert/strict";
import { inspectSource } from "../check-boundaries.mjs";

test("rejects raw HTML, including createElement aliases, outside atoms", () => {
  assert.equal(
    inspectSource(
      "components/atoms/button.tsx",
      "export const Button=()=> <button/>;",
    ).length,
    0,
  );
  assert.match(
    inspectSource(
      "sections/home/home-view.tsx",
      "export const View=()=> <div/>;",
    ).join(),
    /raw <div>/,
  );
  assert.match(
    inspectSource(
      "sections/home/home-view.tsx",
      "import {createElement as el} from 'react'; const x=el('span');",
    ).join(),
    /raw <span>/,
  );
});
test("layout only allows framework document tags", () => {
  assert.equal(
    inspectSource(
      "app/layout.tsx",
      "export const Layout=()=> <html><body/></html>;",
    ).length,
    0,
  );
  assert.match(
    inspectSource("app/layout.tsx", "export const Layout=()=> <div/>;").join(),
    /raw/,
  );
});
test("rejects upward and section-crossing imports", () => {
  assert.match(
    inspectSource(
      "components/atoms/box.tsx",
      "import {Panel} from '../organisms/panel';",
    ).join(),
    /cannot import organisms/,
  );
  assert.match(
    inspectSource(
      "sections/home/home-container.tsx",
      "import {Albums} from '../albums/albums-container';",
    ).join(),
    /another section/,
  );
});
test("rejects hooks and side effects in view, executable DTO content", () => {
  assert.match(
    inspectSource(
      "sections/home/home-view.tsx",
      "import {useState as state} from 'react'; const x=state(0);",
    ).join(),
    /cannot call React hooks/,
  );
  assert.match(
    inspectSource(
      "sections/home/home-view.tsx",
      "import {load} from '../../services/api';",
    ).join(),
    /presentational/,
  );
  assert.match(
    inspectSource("dto/photo.dto.ts", "export const photo = 1;").join(),
    /types only/,
  );
  assert.equal(
    inspectSource("dto/photo.dto.ts", "export interface Photo { id: string }")
      .length,
    0,
  );
});
