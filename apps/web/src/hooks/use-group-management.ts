"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useGallery } from "@/hooks/use-gallery";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, post } from "@/services/api-client";
import type { Invitation } from "@/dto/invitation.dto";
export function useGroupManagement() {
  const gallery = useGallery(),
    { user } = useAuth();
  const group = gallery.data.groups.find((g) => g.id === gallery.groupId);
  const [name, setName] = useState(""),
    [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]),
    [created, setCreated] = useState<Invitation | null>(null),
    [qr, setQr] = useState("");
  const [listError, setListError] = useState(""),
    [listLoading, setListLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const revision = useRef(0);
  const load = useCallback(async () => {
    const generation = ++revision.current;
    setInvitations([]);
    setListError("");
    if (!group || group.role !== "OWNER") return;
    setListLoading(true);
    try {
      const result = await apiRequest<{ invitations: Invitation[] }>(
        `/v1/groups/${group.id}/invitations`,
      );
      if (generation === revision.current) setInvitations(result.invitations);
    } catch (error) {
      if (generation === revision.current)
        setListError(
          error instanceof Error ? error.message : "초대를 불러오지 못했어요.",
        );
    } finally {
      if (generation === revision.current) setListLoading(false);
    }
  }, [group]);
  useEffect(() => {
    let active = true;
    const counter = revision;
    queueMicrotask(() => {
      if (active) {
        setCreated(null);
        setQr("");
        void load();
      }
    });
    return () => {
      active = false;
      counter.current++;
    };
  }, [load]);
  async function run(work: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "요청을 처리하지 못했어요.",
      );
    } finally {
      setPending(false);
    }
  }
  async function create() {
    await run(async () => {
      if (!name.trim()) return;
      await gallery.createGroup(name.trim());
      setName("");
      setNotice("그룹을 만들었어요.");
    });
  }
  async function invite() {
    await run(async () => {
      if (!group) return;
      const groupId = group.id;
      const result = await post<Invitation>(
        `/v1/groups/${groupId}/invitations`,
        { expiresInHours: 72, maxUses: 10 },
      );
      setCreated(result);
      if (result.url)
        setQr(
          await QRCode.toDataURL(result.url, {
            width: 240,
            margin: 2,
            color: { dark: "#1e2023", light: "#ffffff" },
          }),
        );
      await load();
    });
  }
  async function revoke(id: string) {
    await run(async () => {
      if (!group) return;
      await apiRequest<void>(
        `/v1/groups/${group.id}/invitations/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (created?.id === id) {
        setCreated(null);
        setQr("");
      }
      await load();
      setNotice("초대를 취소했어요. 이 링크와 코드로는 참여할 수 없어요.");
    });
  }
  async function copy(value: string) {
    await run(async () => {
      if (!navigator.clipboard)
        throw new Error(
          "복사 기능을 사용할 수 없어요. 표시된 링크나 코드를 길게 눌러 복사해 주세요.",
        );
      await navigator.clipboard.writeText(value);
      setNotice("복사했어요.");
    });
  }
  return {
    gallery,
    verified: !!user?.emailVerified,
    group,
    name,
    setName,
    pending,
    error,
    notice,
    invitations,
    created,
    qr,
    listError,
    listLoading,
    load,
    create,
    invite,
    revoke,
    copy,
  };
}
