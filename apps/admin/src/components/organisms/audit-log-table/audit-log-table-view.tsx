import {
  Box,
  Caption,
  Code,
  Span,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Time,
  Tr,
} from '@/components/atoms/ui';
import type { AuditLogRowViewModel } from '@/dto/audit-log-view.dto';
function Missing() {
  return (
    <>
      <Span aria-hidden='true'>—</Span>
      <Span className='sr-only'>없음</Span>
    </>
  );
}
// Audit entries as a real table. Server text (reason, ids) is plain text.
export function AuditLogTableView({
  caption,
  rows,
}: {
  caption: string;
  rows: AuditLogRowViewModel[];
}) {
  return (
    <Box
      className='table-scroll'
      role='region'
      aria-label={`${caption} (가로로 스크롤할 수 있어요)`}
      tabIndex={0}
    >
      <Table className='data-table'>
        <Caption className='sr-only'>{caption}</Caption>
        <Thead>
          <Tr>
            <Th scope='col' className='col-time'>
              시간 (KST)
            </Th>
            <Th scope='col' className='col-admin'>
              관리자
            </Th>
            <Th scope='col' className='col-action'>
              작업
            </Th>
            <Th scope='col' className='col-target'>
              대상
            </Th>
            <Th scope='col'>사유</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => (
            <Tr key={row.id} id={row.domId} tabIndex={-1}>
              <Td className='cell-time'>
                <Time dateTime={row.dateTime}>{row.time || row.dateTime}</Time>
              </Td>
              <Td>
                <Span className={row.knownAdmin ? undefined : 'muted'}>
                  {row.adminName}
                </Span>
              </Td>
              <Td>
                <Span className='cell-title'>{row.actionLabel}</Span>
                {row.actionLabel !== row.action && (
                  <Code className='cell-code' translate='no'>
                    {row.action}
                  </Code>
                )}
                {row.details && (
                  <Span className='cell-meta'>{row.details}</Span>
                )}
              </Td>
              <Td>
                {row.target || row.targetId ? (
                  <>
                    {row.target && (
                      <Span className='cell-title'>{row.target}</Span>
                    )}
                    {row.targetId && (
                      <Code className='cell-code' translate='no'>
                        {row.targetId}
                      </Code>
                    )}
                  </>
                ) : (
                  <Missing />
                )}
              </Td>
              <Td className='cell-reason'>
                {row.reason ? row.reason : <Missing />}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
