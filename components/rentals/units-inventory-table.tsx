'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UnitInventoryRow } from '@/lib/db/rentals-units';
import { UnitStatus } from '@/lib/db/types';

const STATUS_ORDER: UnitStatus[] = ['Vacant', 'Occupied', 'Unavailable'];

const STATUS_BADGE_STYLES: Record<UnitStatus, string> = {
  Vacant: 'bg-green-100 text-green-700',
  Occupied: 'bg-blue-100 text-blue-700',
  Unavailable: 'bg-amber-100 text-amber-800',
};

interface PropertyOption {
  id: number;
  name: string;
}

interface UnitsInventoryTableProps {
  units: UnitInventoryRow[];
  properties: PropertyOption[];
  lang: string;
}

function formatDecimal(value: string): string {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return Number.isInteger(parsed) ? parsed.toString() : parsed.toFixed(1);
}

export function UnitsInventoryTable({
  units,
  properties,
  lang,
}: UnitsInventoryTableProps) {
  const t = useTranslations('rentals');
  const router = useRouter();
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredUnits = useMemo(() => {
    const normalizedSearch = searchFilter.trim().toLowerCase();

    return units.filter((unit) => {
      if (propertyFilter !== 'all' && unit.property_id.toString() !== propertyFilter) {
        return false;
      }

      if (statusFilter !== 'all' && unit.current_status !== statusFilter) {
        return false;
      }

      if (normalizedSearch.length === 0) {
        return true;
      }

      const searchable = [
        unit.property_name,
        unit.unit_number,
        unit.unit_type,
        unit.building_label ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [units, propertyFilter, statusFilter, searchFilter]);

  const groupedUnits = useMemo(() => {
    return STATUS_ORDER.map((status) => ({
      status,
      units: filteredUnits.filter((unit) => unit.current_status === status),
    })).filter((group) => group.units.length > 0);
  }, [filteredUnits]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="w-full md:max-w-xs">
          <label className="mb-1 block text-sm font-medium">{t('inventory.filters.property')}</label>
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger data-testid="inventory-filter-property">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inventory.filters.allProperties')}</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id.toString()}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:max-w-xs">
          <label className="mb-1 block text-sm font-medium">{t('inventory.filters.status')}</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="inventory-filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('inventory.filters.allStatuses')}</SelectItem>
              {STATUS_ORDER.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full md:max-w-sm">
          <label className="mb-1 block text-sm font-medium">{t('inventory.filters.search')}</label>
          <Input
            data-testid="inventory-filter-search"
            value={searchFilter}
            onChange={(event) => setSearchFilter(event.target.value)}
            placeholder={t('inventory.filters.searchPlaceholder')}
          />
        </div>
      </div>

      {filteredUnits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('inventory.emptyFiltered')}</p>
      ) : (
        groupedUnits.map((group) => (
          <section key={group.status} className="space-y-2" data-testid={`inventory-group-${group.status}`}>
            <h3 className="text-lg font-semibold">
              {t(`status.${group.status}`)} ({group.units.length})
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inventory.columns.property')}</TableHead>
                  <TableHead>{t('inventory.columns.unit')}</TableHead>
                  <TableHead>{t('inventory.columns.type')}</TableHead>
                  <TableHead>{t('inventory.columns.layout')}</TableHead>
                  <TableHead>{t('inventory.columns.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.units.map((unit) => (
                  <TableRow
                    key={unit.id}
                    className="cursor-pointer"
                    data-testid={`inventory-row-${unit.id}`}
                    onClick={() => router.push(`/rentals/units/${unit.id}?lang=${lang}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(`/rentals/units/${unit.id}?lang=${lang}`);
                      }
                    }}
                    tabIndex={0}
                  >
                    <TableCell>{unit.property_name}</TableCell>
                    <TableCell className="font-medium">
                      {unit.building_label ? `${unit.building_label} • ` : ''}
                      {unit.unit_number}
                    </TableCell>
                    <TableCell>{unit.unit_type}</TableCell>
                    <TableCell>
                      {formatDecimal(unit.bedrooms)} / {formatDecimal(unit.bathrooms)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE_STYLES[unit.current_status]}`}
                      >
                        {t(`status.${unit.current_status}`)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ))
      )}

      <div className="flex justify-end">
        <Button asChild>
          <Link href={`/rentals/units/new?lang=${lang}`}>{t('inventory.newUnit')}</Link>
        </Button>
      </div>
    </div>
  );
}
