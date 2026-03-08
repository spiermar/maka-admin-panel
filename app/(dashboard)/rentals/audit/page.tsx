import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuditEvents, AuditEventWithUser } from '@/lib/db/rentals-audit';
import { getLangFromUrl } from '@/lib/i18n/utils';
import { Button } from '@/components/ui/button';

function formatDateTime(value: string, lang: string): string {
  return new Date(value).toLocaleString(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEventType(type: string): string {
  switch (type) {
    case 'lease_status_change':
      return 'Lease Status Change';
    case 'rent_amount_edit':
      return 'Rent Amount Edit';
    case 'payment_adjustment':
      return 'Payment Adjustment';
    default:
      return type;
  }
}

function formatEntityLink(entityType: string, entityId: number): string {
  switch (entityType) {
    case 'lease':
      return `Lease #${entityId}`;
    case 'charge':
      return `Charge #${entityId}`;
    case 'payment':
      return `Payment #${entityId}`;
    default:
      return `${entityType} #${entityId}`;
  }
}

function formatValueChange(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null
): string {
  if (!oldValue && !newValue) return '-';
  
  const formatObj = (obj: Record<string, unknown> | null): string => {
    if (!obj) return 'none';
    return Object.entries(obj)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };
  
  if (oldValue && newValue) {
    return `${formatObj(oldValue)} → ${formatObj(newValue)}`;
  }
  if (newValue) {
    return `Created: ${formatObj(newValue)}`;
  }
  return formatObj(oldValue);
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    eventType?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}) {
  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();
  const { eventType, startDate, endDate, page } = await searchParams;
  
  const currentPage = page ? parseInt(page, 10) : 1;
  const pageSize = 20;
  
  const filters = {
    eventType: eventType ?? undefined,
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
  };
  
  const { events, total } = await getAuditEvents(filters, currentPage, pageSize);
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{t('audit.title')}</h2>
        <p className="text-muted-foreground">{t('audit.subtitle')}</p>
      </div>

      {/* Filter Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('audit.filterTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1">
              <label htmlFor="eventType" className="text-sm font-medium">
                {t('audit.eventType')}
              </label>
              <select
                id="eventType"
                name="eventType"
                defaultValue={eventType ?? ''}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('audit.allTypes')}</option>
                <option value="lease_status_change">{t('audit.typeLeaseStatus')}</option>
                <option value="rent_amount_edit">{t('audit.typeRentEdit')}</option>
                <option value="payment_adjustment">{t('audit.typePayment')}</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label htmlFor="startDate" className="text-sm font-medium">
                {t('audit.startDate')}
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                defaultValue={startDate ?? ''}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label htmlFor="endDate" className="text-sm font-medium">
                {t('audit.endDate')}
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                defaultValue={endDate ?? ''}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            
            <Button type="submit" variant="default">
              {t('audit.applyFilter')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">{t('audit.noEvents')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? 'event' : 'events'} found
          </p>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">{t('audit.dateTime')}</th>
                      <th className="text-left py-3 px-4 font-medium">{t('audit.user')}</th>
                      <th className="text-left py-3 px-4 font-medium">{t('audit.eventTypeCol')}</th>
                      <th className="text-left py-3 px-4 font-medium">{t('audit.entity')}</th>
                      <th className="text-left py-3 px-4 font-medium">{t('audit.details')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event: AuditEventWithUser) => (
                      <tr key={event.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm">
                          {formatDateTime(event.created_at, lang)}
                        </td>
                        <td className="py-3 px-4 text-sm">{event.user_email}</td>
                        <td className="py-3 px-4 text-sm">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                            {formatEventType(event.event_type)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {formatEntityLink(event.entity_type, event.entity_id)}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {formatValueChange(event.old_value, event.new_value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              {currentPage > 1 && (
                <Button variant="outline" asChild>
                  <a
                    href={`?page=${currentPage - 1}${
                      eventType ? `&eventType=${eventType}` : ''
                    }${startDate ? `&startDate=${startDate}` : ''}${
                      endDate ? `&endDate=${endDate}` : ''
                    }`}
                  >
                    Previous
                  </a>
                </Button>
              )}
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages && (
                <Button variant="outline" asChild>
                  <a
                    href={`?page=${currentPage + 1}${
                      eventType ? `&eventType=${eventType}` : ''
                    }${startDate ? `&startDate=${startDate}` : ''}${
                      endDate ? `&endDate=${endDate}` : ''
                    }`}
                  >
                    Next
                  </a>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}