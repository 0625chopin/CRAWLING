import { TriangleAlert } from 'lucide-react'

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export interface ErrorAlertProps {
  title?: string
  description: string
  onRetry?: () => void
}

/**
 * 오류 표시 공통 블록.
 * Alert에 role="alert"이 내장돼 있어 별도 지정이 필요 없다.
 */
export function ErrorAlert({
  title = '오류가 발생했어요',
  description,
  onRetry,
}: ErrorAlertProps) {
  return (
    <Alert variant="destructive">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      {onRetry && (
        <AlertAction>
          <Button variant="outline" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        </AlertAction>
      )}
    </Alert>
  )
}
