import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Clock, BookOpen, CheckCircle } from 'lucide-react';
import { ReadingPlan } from '@/types/supabase';
import { getAvailablePlans } from '@/services/readingPlan/planService';

interface PlanSelectorProps {
  selectedPlanId?: string;
  onPlanSelect: (planId: string) => void;
  disabled?: boolean;
}

const PlanSelector: React.FC<PlanSelectorProps> = ({
  selectedPlanId,
  onPlanSelect,
  disabled = false
}) => {
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      const availablePlans = await getAvailablePlans();
      setPlans(availablePlans);
      setLoading(false);
    };
    
    loadPlans();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <Card 
          key={plan.id} 
          className={`cursor-pointer transition-all duration-200 overflow-hidden ${
            selectedPlanId === plan.id 
              ? 'ring-2 ring-primary border-primary bg-primary/5' 
              : 'hover:shadow-md border-border'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onPlanSelect(plan.id)}
        >
          {/* Image du plan */}
          {plan.image_url && (
            <div className="h-28 w-full overflow-hidden">
              <img 
                src={plan.image_url} 
                alt={plan.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {plan.name}
                {selectedPlanId === plan.id && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {plan.duration_days} jours
              </Badge>
            </div>
            {plan.description && (
              <CardDescription className="text-sm">
                {plan.description}
              </CardDescription>
            )}
          </CardHeader>
        </Card>
      ))}
    </div>
  );
};

export default PlanSelector;