import React from 'react';
import Button from '@mui/material/Button';

const PurpleButton = (props) => (
  <Button {...props} sx={{ bgcolor: '#7c3aed', color: '#fff', '&:hover': { bgcolor: '#6d28d9' }, ...props.sx }} />
);

export default PurpleButton;
