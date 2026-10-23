import React from 'react';
import { Chip } from '@mui/material';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = (status || 'ACTIVE').toUpperCase();

  let color: 'success' | 'default' | 'error' | 'warning' = 'default';
  let label = normalized;

  switch (normalized) {
    case 'ACTIVE':
      color = 'success';
      label = 'Active';
      break;
    case 'ON_LEAVE':
      color = 'warning';
      label = 'On Leave';
      break;
    case 'INACTIVE':
      color = 'default';
      label = 'Inactive';
      break;
    case 'TERMINATED':
      color = 'error';
      label = 'Terminated';
      break;
  }

  return (
    <Chip
      size="small"
      label={label}
      color={color}
      variant="filled"
      sx={{
        fontWeight: 600,
        fontSize: '0.75rem',
        height: '22px',
      }}
    />
  );
};
