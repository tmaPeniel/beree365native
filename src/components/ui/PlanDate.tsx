import React from 'react';
import { Card, CardContent } from './card';

interface PlanDatesProps {
  startDate: Date;
  endDate: Date;
  remainingDays: number;
}

const PlanDates: React.FC<PlanDatesProps> = ({
  startDate,
  endDate,
  remainingDays,
}) => (
    <Card className="bg-card border-border shadow-sm">
      <CardContent className="p-6">
            <div className="text-sm text-muted-foreground grid grid-cols-2 gap-3 mt-6">
                <div className="bg-primary/10 p-3 rounded">
                <p className="mb-1 text-primary">Date de début</p>
                <p className="font-medium text-foreground">{startDate.toLocaleDateString()}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded">
                <p className="mb-1 text-primary">Date de fin</p>
                <p className="font-medium text-foreground">{endDate.toLocaleDateString()}</p>
                </div>
                <div className="col-span-2 bg-accent/10 p-3 rounded">
                <p className="mb-1 text-accent">Jours restants</p>
                <p className="font-medium text-foreground">{remainingDays} jours</p>
                </div>
            </div>
        </CardContent>
  </Card>
  );

export default PlanDates;