import express from 'express';
const app=express();app.use(express.json());
const plans={go:{currency:'NGN',priceMinor:1000000,trialDays:0},pro:{currency:'NGN',priceMinor:3000000,trialDays:60},ultra:{currency:'NGN',priceMinor:5000000,trialDays:7}};
app.get('/health',(_,res)=>res.json({ok:true,service:'veylora-api'}));
app.get('/api/plans',(_,res)=>res.json({region:'NG',plans}));
app.post('/api/payments/orders',(req,res)=>{const p=plans[req.body?.plan];if(!p)return res.status(400).json({error:'Invalid plan'});res.status(201).json({status:'PENDING',plan:req.body.plan,...p})});
app.post('/api/payments/webhook',(_,res)=>res.status(202).json({received:true}));
app.listen(Number(process.env.PORT||3000),()=>console.log('Veylora API running'));