'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Box, Typography, Grid, Paper, TextField, Button, Stack, Divider, CircularProgress, Alert
} from '@mui/material';

type Project = { id:string; name:string; slug:string; status:string; createdAt:string };

export default function DashboardPage(){
  const [loading,setLoading]=useState(true);
  const [projects,setProjects]=useState<Project[]>([]);
  const [err,setErr]=useState<string|null>(null);
  const [form,setForm]=useState({ name:'', slug:'' });
  const [creating,setCreating]=useState(false);

  useEffect(()=>{
    (async()=>{
      const res=await fetch('/api/projects');
      if(!res.ok){ setErr('Failed to load projects'); setLoading(false); return; }
      const j=await res.json();
      setProjects(j.projects || []); setLoading(false);
    })();
  },[]);

  const createProject=async()=>{
    setCreating(true); setErr(null);
    const res=await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    setCreating(false);
    if(!res.ok){ setErr('Create failed'); return; }
    const j=await res.json();
    setProjects(p=>[j.project, ...p]); setForm({name:'',slug:''});
  };

  return (
    <Box sx={{p:3}}>
      <Box sx={{display:'flex', alignItems:'center', justifyContent:'space-between', mb:3}}>
        <Typography variant="h4" sx={{fontWeight:800}}>Dashboard</Typography>
        <Box />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{
            p:2, borderRadius:3, mb:2,
            backdropFilter: 'blur(18px)',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.16)'
          }}>
            <Typography variant="h6" sx={{mb:1.5, fontWeight:700}}>Create a new project</Typography>
            <Stack spacing={1.5}>
              <TextField size="small" label="Project name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
              <TextField size="small" label="Slug" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')})}/>
              <Button variant="contained" onClick={createProject} disabled={creating || !form.name || !form.slug}>
                {creating?'Creating…':'Create'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{
            p:2, borderRadius:3,
            backdropFilter: 'blur(18px)',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.16)'
          }}>
            <Box sx={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <Typography variant="h6" sx={{fontWeight:700}}>My projects</Typography>
            </Box>
            <Divider sx={{my:1.5}}/>
            {loading ? <CircularProgress size={20}/> :
             err ? <Alert severity="error">{err}</Alert> :
             projects.length===0 ? <Typography variant="body2" sx={{opacity:.8}}>No projects yet.</Typography> :
             <Stack spacing={1}>
               {projects.map(p=>(
                 <Box key={p.id} sx={{
                   p:1.25, borderRadius:2,
                   border:'1px solid rgba(255,255,255,0.14)',
                   display:'flex', alignItems:'center', justifyContent:'space-between'
                 }}>
                   <Box>
                     <Typography sx={{fontWeight:600}}>{p.name}</Typography>
                     <Typography variant="caption" sx={{opacity:.7}}>/{p.slug} — {p.status}</Typography>
                   </Box>
                   <Stack direction="row" spacing={1}>
                     <Link href={`/studio?project=${p.id}`} style={{textDecoration:'none'}}>
                       <Button size="small" variant="outlined">Open in Studio</Button>
                     </Link>
                   </Stack>
                 </Box>
               ))}
             </Stack>}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
