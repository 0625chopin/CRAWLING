import { Fragment } from 'react'
import Link from 'next/link'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export interface PageHeaderCrumb {
  label: string
  /** 생략하면 현재 페이지로 간주해 링크 대신 BreadcrumbPage로 렌더한다. */
  href?: string
}

export interface PageHeaderProps {
  breadcrumbs: PageHeaderCrumb[]
  title: string
  description?: string
  /** 제목 우측에 붙는 액션 영역(주로 버튼). */
  action?: React.ReactNode
}

/** 5개 페이지가 공통으로 쓰는 페이지 헤더 블록(Breadcrumb + h1 + 설명). */
export function PageHeader({
  breadcrumbs,
  title,
  description,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <Fragment key={crumb.label}>
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
    </div>
  )
}
