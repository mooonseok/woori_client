import { Box, Heading, Text, Button } from "@/components/atoms/ui";
import { Icon } from "@/components/atoms/icon";
import { Link } from "@/components/molecules/link";
interface Props {
  email: string;
  verified: boolean;
  loading: boolean;
  signedIn: boolean;
  token: boolean;
  pending: boolean;
  error: string;
  message: string;
  loginUrl: string;
  onConfirm: () => void;
  onResend: () => void;
  onContinue: () => void;
}
export function VerifyEmailView(p: Props) {
  return (
    <Box className="auth-panel">
      <Icon name="shield" size={32} />
      <Heading>
        {p.verified ? "이메일 확인이 완료됐어요" : "이메일을 확인해 주세요"}
      </Heading>
      {p.loading ? (
        <Text role="status">계정을 확인하고 있어요…</Text>
      ) : !p.signedIn ? (
        <>
          <Text>확인 링크를 받은 계정으로 로그인해 주세요.</Text>
          <Link className="primary-button" href={p.loginUrl}>
            로그인하고 계속
          </Link>
        </>
      ) : p.verified ? (
        <Button className="primary-button" onClick={p.onContinue}>
          계속하기
        </Button>
      ) : (
        <>
          <Text>
            {p.email} 주소로 받은 확인 링크를 열어 주세요. 가족만 들어오는
            공간을 위해 한 번 확인해요.
          </Text>
          {p.token && (
            <Button
              className="primary-button"
              disabled={p.pending}
              onClick={p.onConfirm}
            >
              {p.pending ? "확인 중…" : "이 이메일로 확인하기"}
            </Button>
          )}
          <Button
            className="secondary-button"
            disabled={p.pending}
            onClick={p.onResend}
          >
            확인 메일 다시 보내기
          </Button>
          <Text className="field-help">
            메일이 오지 않으면 스팸함을 확인해 주세요. 전송 오류가 계속되면
            서비스 운영자에게 문의해 주세요.
          </Text>
        </>
      )}
      {p.message && <Text role="status">{p.message}</Text>}
      {p.error && (
        <Text role="alert" className="form-error">
          {p.error}
        </Text>
      )}
    </Box>
  );
}
