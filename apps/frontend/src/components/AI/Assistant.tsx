'use client';

import { useState } from 'react';
import { Fab, Drawer, Box, Typography, TextField, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

const fabVariants = {
  hidden: { scale: 0, y: 50, opacity: 0 },
  visible: { scale: 1, y: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20, delay: 0.5 } },
};

export default function Assistant() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.div
            variants={fabVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1301 }}
          >
            <Fab color="primary" aria-label="ai assistant" onClick={() => setOpen(true)}>
              <AutoAwesomeIcon />
            </Fab>
          </motion.div>
        )}
      </AnimatePresence>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '90%', sm: 400 },
            border: 'none',
            // Apply glass theme directly as Drawer is a portal
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            backgroundColor: (theme) => theme.palette.background.paper,
            backgroundImage: (theme) => theme.palette.mode === 'dark' ? 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))' : 'none',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">CeruleAI Assistant</Typography>
                <IconButton onClick={() => setOpen(false)}><CloseIcon/></IconButton>
            </Box>
            <Box sx={{flexGrow: 1, overflowY: 'auto'}}>
                {/* Chat messages would go here */}
                <Typography variant="body2" color="text.secondary">Ready to help you build.</Typography>
            </Box>
            <Box component="form" sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <TextField fullWidth placeholder="Ask me anything..." size="small"/>
                <IconButton color="primary" type="submit"><SendIcon/></IconButton>
            </Box>
        </Box>
      </Drawer>
    </>
  );
}