import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-48 bg-slate-200 rounded animate-pulse" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-slate-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-slate-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}
