import React from 'react';
import { Box, Typography } from '@mui/material';

interface CurrencyBadgeProps {
  currency: string;
}

export const CurrencyBadge: React.FC<CurrencyBadgeProps> = ({ currency }) => {
  const curr = (currency || 'USD').toUpperCase();

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        borderRadius: 1,
        backgroundColor: '#f1f5f9',
        border: '1px solid #e2e8f0',
        fontWeight: 600,
        fontSize: '0.75rem',
        color: '#475569',
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>
        {curr}
      </Typography>
    </Box>
  );
};
