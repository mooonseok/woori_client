"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useGallery } from "@/hooks/use-gallery";
import { post } from "@/services/api-client";
import { authDestination } from "@/utils/auth-navigation";
import { rememberInvite, clearPendingInvite } from "@/services/invite-return";
import type { InviteInput } from "@/dto/invitation.dto";
import type { Group } from "@/dto/album.dto";
import { InviteView } from "./invite-view";
export function InviteContainer() {
  const params = useSearchParams(),
    router = useRouter(),
    auth = useAuth(),
    gallery = useGallery();
  const token = params.get("token") || "",
    urlCode = params.get("code") || "";
  const [code, setCode] = useState(urlCode),
    [checked, setChecked] = useState<InviteInput | null>(null);
  const [preview, setPreview] = useState<{
    groupName: string;
    expiresAt: string;
  } | null>(null);
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const revision = useRef(0);
  async function inspect(input: InviteInput) {
    const request = ++revision.current;
    setPending(true);
    setError("");
    setPreview(null);
    setChecked(null);
    try {
      const result = await post<{ groupName: string; expiresAt: string }>(
        "/v1/invitations/preview",
        input,
      );
      if (request === revision.current) {
        setPreview(result);
        setChecked(input);
      }
    } catch (error) {
      if (request === revision.current)
        setError(
          error instanceof Error ? error.message : "초대를 확인하지 못했어요.",
        );
    } finally {
      if (request === revision.current) setPending(false);
    }
  }
  useEffect(() => {
    let active = true;
    const counter = revision;
    queueMicrotask(() => {
      if (active && (token || urlCode))
        void inspect(token ? { token } : { code: urlCode });
    });
    return () => {
      active = false;
      counter.current++;
    };
  }, [token, urlCode]);
  const next = checked
    ? `/invite?${new URLSearchParams(checked as Record<string, string>)}`
    : "/invite";
  async function join() {
    if (!checked || pending) return;
    rememberInvite(next);
    if (!auth.user) {
      router.push(authDestination("/login", next));
      return;
    }
    if (!auth.user.emailVerified) {
      router.push(authDestination("/verify-email", next));
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await post<{ group: Group; alreadyMember: boolean }>(
        "/v1/invitations/join",
        checked,
      );
      await gallery.reload();
      gallery.setGroupId(result.group.id);
      clearPendingInvite();
      router.replace("/albums");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "그룹에 참여하지 못했어요.",
      );
    } finally {
      setPending(false);
    }
  }
  function change(value: string) {
    revision.current++;
    setCode(value);
    setChecked(null);
    setPreview(null);
    setError("");
    setPending(false);
  }
  return (
    <InviteView
      code={code}
      onCode={change}
      preview={preview}
      pending={pending || auth.status === "loading"}
      error={error}
      hasToken={!!token}
      onInspect={() =>
        void inspect({ code: code.replace(/[\s-]/g, "").toUpperCase() })
      }
      onJoin={() => void join()}
      joinLabel={
        !auth.user
          ? "로그인하고 참여"
          : !auth.user.emailVerified
            ? "이메일 확인 후 참여"
            : "이 그룹에 참여하기"
      }
      signupUrl={authDestination("/signup", next)}
      showSignup={auth.status === "anonymous"}
    />
  );
}
