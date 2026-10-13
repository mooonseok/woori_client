import { Box, Heading, Text, Button } from "@/components/atoms/ui";
import { Icon } from "@/components/atoms/icon";
export function EmptyState({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Box className="empty-state">
      <Icon name="album" size={36} />
      <Heading>{title}</Heading>
      <Text>{body}</Text>
      {action && (
        <Button className="primary" onClick={onAction}>
          {action}
        </Button>
      )}
    </Box>
  );
}
