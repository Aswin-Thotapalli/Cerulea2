'use client';
import { Container, Grid, Card, CardContent, Skeleton } from '@mui/material';

export default function Loading() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Grid container spacing={3}>
        {[...Array(4)].map((_, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card><CardContent><Skeleton width="60%" height={28} /><Skeleton height={36} /></CardContent></Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={8}>
          <Card><CardContent>{[...Array(6)].map((_,i)=><Skeleton key={i} height={60} sx={{ mb:1 }} />)}</CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent>{[...Array(6)].map((_,i)=><Skeleton key={i} height={40} sx={{ mb:1 }} />)}</CardContent></Card>
        </Grid>
      </Grid>
    </Container>
  );
}
