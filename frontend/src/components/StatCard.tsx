import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  footnote?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  badge,
  footnote,
}) => {
  return (
    <Card sx={{ height: '100%', position: 'relative' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color: '#6366f1', display: 'flex', alignItems: 'center' }}>
              {icon}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0f172a' }}>
            {value}
          </Typography>
          {badge}
        </Box>

        {subtitle && (
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {subtitle}
          </Typography>
        )}

        {footnote && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#94a3b8', fontStyle: 'italic' }}>
            {footnote}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
