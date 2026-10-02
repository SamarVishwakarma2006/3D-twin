'use client';
import { useState } from 'react';
import { Intake } from '../components/Intake';
import { Workspace } from '../components/Workspace';
export default function Page() { const [open,setOpen]=useState(false);return open?<Workspace onBack={()=>setOpen(false)}/>:<Intake onOpen={()=>setOpen(true)}/>; }
