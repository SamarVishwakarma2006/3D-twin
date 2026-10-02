'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Grid, OrbitControls, RoundedBox, useGLTF } from '@react-three/drei';
import { Box3, Color, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useWorkspace } from '../lib/store';
import type { Component } from '../lib/product';
import { ErrorBoundary } from './ErrorBoundary';

function positionOf(c:Component, mode:string, explosion:number, group:string) {
  return c.geometry.position.map((v,i) => v + (mode === 'Exploded' && (group === 'all' || c.systemId === group) ? c.geometry.explodedOffset[i] * explosion : 0)) as [number,number,number];
}
function Part({component:c}: {component:Component}) {
  const s = useWorkspace(); const ref = useRef<Mesh>(null); const material = useRef<MeshStandardMaterial>(null); const [hovered,setHovered] = useState(false);
  const selected = s.selectedComponentId === c.id;
  const status = s.compareBefore ? 'healthy' : s.activeSimulation?.statuses[c.id];
  const color = status === 'failed' ? '#e97676' : status === 'degraded' ? '#e4b461' : c.geometry.color;
  const visible = !s.hiddenComponentIds.includes(c.id) && (!s.isolatedComponentId || s.isolatedComponentId === c.id);
  const faded = s.focusedComponentId && s.focusedComponentId !== c.id;
  const opacity = faded ? .09 : s.mode === 'X-Ray' && c.geometry.exterior ? Math.max(.06,1-s.xRayIntensity) : 1;
  const target = useMemo(() => new Vector3(...positionOf(c,s.mode,s.explosionFactor,s.explosionGroup)),[c,s.mode,s.explosionFactor,s.explosionGroup]);
  const reduced = useRef(false);
  useEffect(() => { const query = window.matchMedia('(prefers-reduced-motion: reduce)'); reduced.current=query.matches; const update=()=>{reduced.current=query.matches;}; query.addEventListener('change',update); return ()=>query.removeEventListener('change',update); },[]);
  useFrame((_,delta) => {
    ref.current?.position.lerp(target,reduced.current ? 1 : 1-Math.exp(-delta*10));
    if (material.current) material.current.opacity += (opacity-material.current.opacity)*(reduced.current ? 1 : 1-Math.exp(-delta*10));
  });
  return <RoundedBox ref={ref} args={c.geometry.size} radius={Math.min(...c.geometry.size)/4} smoothness={3} position={c.geometry.position} visible={visible}
    onPointerOver={e=>{e.stopPropagation();setHovered(true);}} onPointerOut={()=>setHovered(false)}
    onClick={e=>{if (s.mode==='X-Ray' && c.geometry.exterior && s.xRayIntensity>.4) return; e.stopPropagation();s.select(c.id);}}>
    <meshStandardMaterial ref={material} color={color} transparent opacity={opacity} depthWrite={opacity>.5} metalness={.25} roughness={.48} emissive={new Color(selected?'#77dcb9':hovered?'#668bab':'#000000')} emissiveIntensity={selected?.4:hovered?.2:0}/>
  </RoundedBox>;
}
function ImportedModel() {
  const s=useWorkspace(); const gltf=useGLTF(s.product.model3D.url!); const root=useMemo(()=>gltf.scene.clone(true),[gltf.scene]);
  useEffect(()=> {
    const owned: MeshStandardMaterial[]=[];
    root.traverse(object=>{ if(object instanceof Mesh){const materials=Array.isArray(object.material)?object.material:[object.material]; object.material=materials.map(m=>{const copy=m.clone();owned.push(copy);return copy;});} });
    return ()=>owned.forEach(m=>m.dispose());
  },[root]);
  const originals=useMemo(()=>{const map=new Map<string,Vector3>();root.traverse(n=>map.set(n.uuid,n.position.clone()));return map;},[root]);
  useFrame((_,delta)=>root.traverse(n=>{
    const c=s.product.components.find(c=>c.modelNodeIds.includes(n.name)); if(!c) return;
    n.visible=!s.hiddenComponentIds.includes(c.id)&&(!s.isolatedComponentId||s.isolatedComponentId===c.id);
    const target=originals.get(n.uuid)!.clone(); if(s.mode==='Exploded'&&(s.explosionGroup==='all'||c.systemId===s.explosionGroup)) target.addScaledVector(new Vector3(...c.geometry.explodedOffset),s.explosionFactor);
    n.position.lerp(target,1-Math.exp(-delta*10));
    if(n instanceof Mesh) for(const mat of (Array.isArray(n.material)?n.material:[n.material])) {mat.transparent=true;mat.opacity=s.focusedComponentId&&s.focusedComponentId!==c.id? .12 : s.mode==='X-Ray'&&c.geometry.exterior?Math.max(.06,1-s.xRayIntensity):1;mat.depthWrite=mat.opacity>.5;if(mat.emissive)mat.emissive.set(s.selectedComponentId===c.id?'#467967':!s.compareBefore&&s.activeSimulation?.statuses[c.id]==='failed'?'#a22d2d':!s.compareBefore&&s.activeSimulation?.statuses[c.id]==='degraded'?'#926219':'#000000');}
  }));
  return <primitive object={root} onClick={(e:{stopPropagation:()=>void;object:{name:string;parent?:{name:string}|null}})=>{const c=s.product.components.find(c=>c.modelNodeIds.includes(e.object.name)||!!e.object.parent&&c.modelNodeIds.includes(e.object.parent.name));if(c){e.stopPropagation();s.select(c.id);}}}/>;
}
function CameraRig() {
  const s=useWorkspace(); const {camera,scene}=useThree(); const controls=useRef<OrbitControlsImpl>(null); const goal=useRef<{position:Vector3;target:Vector3}|null>(null);
  useEffect(()=>{
    const c=s.product.components.find(c=>c.id===s.focusedComponentId);
    let target=c?new Vector3(...positionOf(c,s.mode,s.explosionFactor,s.explosionGroup)):new Vector3();
    let size=c?Math.max(...c.geometry.size):6;
    if(c&&s.product.model3D.type==='gltf') {const node=scene.getObjectByName(c.modelNodeIds[0]);if(node){const box=new Box3().setFromObject(node);target=box.getCenter(new Vector3());size=box.getSize(new Vector3()).length();}}
    goal.current={target,position:target.clone().add(new Vector3(.6,.35,1).normalize().multiplyScalar(c?Math.max(size*2.2,3):11))};
  },[s.cameraVersion,s.focusedComponentId,s.product,s.mode,s.explosionFactor,s.explosionGroup,scene]);
  useFrame((_,dt)=>{if(!goal.current||!controls.current)return;const a=window.matchMedia('(prefers-reduced-motion: reduce)').matches?1:1-Math.exp(-dt*7);camera.position.lerp(goal.current.position,a);controls.current.target.lerp(goal.current.target,a);controls.current.update();if(camera.position.distanceTo(goal.current.position)<.01)goal.current=null;});
  return <OrbitControls ref={controls} makeDefault minDistance={1.5} maxDistance={35} enableDamping onStart={()=>{goal.current=null;}}/>;
}
function Scene() {
  const s=useWorkspace();
  return <><ambientLight intensity={1.6}/><directionalLight position={[5,8,8]} intensity={3}/><directionalLight position={[-5,0,4]} intensity={1.5}/>
    <group rotation={[0,0,0]}>{s.product.model3D.type==='gltf'&&s.product.model3D.url?<ErrorBoundary fallback={<group>{s.product.components.map(c=><Part key={c.id} component={c}/>)}</group>}><Suspense fallback={<group>{s.product.components.map(c=><Part key={c.id} component={c}/>)}</group>}><ImportedModel/></Suspense></ErrorBoundary>:s.product.components.map(c=><Part key={c.id} component={c}/>)}</group>
    <Grid position={[0,-3.7,0]} args={[30,30]} cellSize={1} cellThickness={.5} cellColor="#384551" sectionColor="#536274" sectionSize={5} fadeDistance={22} infiniteGrid/>
    {s.quality==='High'&&<ContactShadows position={[0,-3.65,0]} opacity={.35} scale={18} blur={2} far={15} resolution={256}/>}
    <CameraRig/>
  </>;
}
export default function Viewer() {
  const quality=useWorkspace(s=>s.quality);
  return <ErrorBoundary fallback={<div className="empty" role="alert"><h3>3D rendering unavailable</h3><p>Use the component navigator, graph and simulation panels. Try a browser with WebGL enabled to restore the 3D view.</p></div>}><Canvas aria-label="Interactive 3D product viewer" camera={{position:[5,3,10],fov:42}} dpr={quality==='Low'?1:quality==='High'?[1,2]:[1,1.5]} gl={{antialias:quality!=='Low',powerPreference:quality==='High'?'high-performance':'default'}}><Scene/></Canvas></ErrorBoundary>;
}

