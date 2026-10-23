import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const DRAWER_WIDTH = 250;

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Employee Directory', path: '/employees', icon: <PeopleIcon /> },
  { label: 'Compensation Analytics', path: '/analytics', icon: <BarChartIcon /> },
  { label: 'Compensation Questions', path: '/questions', icon: <PsychologyAltIcon /> },
  { label: 'Settings & About', path: '/settings', icon: <InfoOutlinedIcon /> },
];

export const Sidebar: React.FC = () => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          borderRight: '1px solid #1e293b',
        },
      }}
    >
      {/* Brand Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem',
            color: '#ffffff',
          }}
        >
          A
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
            ACME
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', letterSpacing: '0.04em' }}>
            Salary Intelligence
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#1e293b' }} />

      {/* Navigation List */}
      <List sx={{ px: 1.5, py: 2 }}>
        {NAV_ITEMS.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={NavLink}
              to={item.path}
              sx={{
                borderRadius: 2,
                color: '#94a3b8',
                '&.active': {
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  '& .MuiListItemIcon-root': {
                    color: '#6366f1',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  color: '#ffffff',
                },
              }}
            >
              <ListItemIcon sx={{ color: '#64748b', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Dataset Footnote */}
      <Box sx={{ mt: 'auto', p: 2, m: 1.5, backgroundColor: '#1e293b', borderRadius: 2 }}>
        <Typography variant="caption" sx={{ color: '#cbd5e1', fontWeight: 600, display: 'block', mb: 0.5 }}>
          Enterprise Seed Dataset
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
          10,000 Employees • 7 Global Currencies
        </Typography>
      </Box>
    </Drawer>
  );
};
