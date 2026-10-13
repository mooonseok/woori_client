import {
  Box,
  Section,
  Heading,
  Text,
  Button,
  Image,
} from "@/components/atoms/ui";
import type { GroupsViewProps } from "./groups-view";
export function GroupInvitationsView(p: GroupsViewProps) {
  return (
    <>
      {" "}
      {p.group && (
        <Section className="settings-card">
          <Heading>{p.group.name} 초대</Heading>
          {p.group.role !== "OWNER" ? (
            <Text className="muted">
              그룹장이 초대 링크와 코드를 만들 수 있어요.
            </Text>
          ) : (
            <>
              <Text className="muted">
                초대는 3일 동안, 최대 10명이 사용할 수 있어요. 아는 사람에게만
                공유해 주세요.
              </Text>
              <Button
                className="secondary-button"
                onClick={() => void p.invite()}
                disabled={p.pending || !p.verified}
              >
                새 초대 만들기
              </Button>
              {p.created && (
                <Box className="invitation-result">
                  <Text className="field-help">
                    링크와 코드는 지금 복사해 두세요. 목록에는 다시 표시되지
                    않아요.
                  </Text>
                  {p.qr && (
                    <Image
                      src={p.qr}
                      width={240}
                      height={240}
                      alt={`${p.group.name} 그룹 초대 QR 코드`}
                    />
                  )}
                  <Text className="invitation-code">{p.created.code}</Text>
                  <Text className="invitation-url">{p.created.url}</Text>
                  <Box className="inline-actions">
                    <Button
                      onClick={() => void p.copy(p.created?.code || "")}
                      className="secondary-button"
                    >
                      코드 복사
                    </Button>
                    <Button
                      onClick={() => void p.copy(p.created?.url || "")}
                      className="secondary-button"
                    >
                      링크 복사
                    </Button>
                  </Box>
                </Box>
              )}
              {p.listLoading && (
                <Text role="status">초대 목록을 확인하고 있어요…</Text>
              )}
              {p.listError && (
                <Box>
                  <Text role="alert">{p.listError}</Text>
                  <Button onClick={() => void p.load()}>
                    목록 다시 불러오기
                  </Button>
                </Box>
              )}
              {p.invitations.map((invitation) => (
                <Box key={invitation.id} className="invitation-row">
                  <Box>
                    <Text>
                      {new Date(invitation.expiresAt).toLocaleString("ko-KR")}{" "}
                      만료
                    </Text>
                    <Text className="muted">
                      {invitation.uses ?? invitation.useCount ?? 0}/
                      {invitation.maxUses}명 참여
                      {invitation.revokedAt ? " · 취소됨" : ""}
                    </Text>
                  </Box>
                  {!invitation.revokedAt && (
                    <Button
                      className="text-button"
                      disabled={p.pending}
                      onClick={() => void p.revoke(invitation.id)}
                    >
                      초대 취소
                    </Button>
                  )}
                </Box>
              ))}
            </>
          )}
        </Section>
      )}
    </>
  );
}
