import { beforeEach, describe, expect, it, vi } from 'vitest';
import { smartphone } from '../data/smartphone';
import { useWorkspace } from './store';
import { identificationInput, localAI, localIdentification, withLocalFallback, type AssistantContext } from './providers';
import { POST } from '../app/api/identify/route';
import { validateImage } from './upload';
const context:AssistantContext={product:smartphone,selectedComponentId:'battery',simulation:null,mode:'Explore',viewer:{hidden:[],focused:null,isolated:null},repairStep:0,compatibilityContext:'Unverified'};
beforeEach(()=>useWorkspace.getState().loadProduct(smartphone));
describe('canonical workspace state',()=>{
  it('synchronizes focus, visibility and selection',()=>{const s=useWorkspace.getState();s.toggleHidden('battery');s.focus('battery');expect(useWorkspace.getState()).toMatchObject({selectedComponentId:'battery',focusedComponentId:'battery',hiddenComponentIds:[]});s.isolate('processor');expect(useWorkspace.getState().selectedComponentId).toBe('processor');s.restore();expect(useWorkspace.getState().isolatedComponentId).toBeNull();});
  it('undoes scenarios and resets without mutating the dataset',()=>{const before=JSON.stringify(smartphone);const s=useWorkspace.getState();s.simulate('battery');s.simulate('camera');s.undoSimulation();expect(useWorkspace.getState().activeSimulation?.rootId).toBe('battery');s.resetSimulation();expect(useWorkspace.getState().activeSimulation).toBeNull();expect(useWorkspace.getState().simulationHistory).toHaveLength(1);expect(JSON.stringify(smartphone)).toBe(before);});
  it('rejects invalid products without replacing the current definition',()=>{useWorkspace.getState().loadProduct({...smartphone,components:[]});expect(useWorkspace.getState().product.id).toBe(smartphone.id);expect(useWorkspace.getState().error).toBeTruthy();});
});
describe('local providers',()=>{
  it('makes no image recognition claims and requires confirmation',async()=>{const result=await localIdentification.identifyProduct({name:'iPhone',manufacturer:'',model:'',images:[]});expect(result.candidates[0].confidence).toBeLessThan(.6);expect(result.candidates[0].reason).toContain('exact product was not identified');const unknown=await localIdentification.identifyProduct({name:'washing machine',manufacturer:'',model:'',images:[]});expect(unknown.candidates[0].confidence).toBe(0);expect(identificationInput.safeParse({name:'',images:[]}).success).toBe(false);});
  it('grounds explanations and falls back on provider failure',async()=>{const provider={...localAI,answerQuestion:vi.fn().mockRejectedValue(new Error('offline'))};const answer=await withLocalFallback(provider,'Explain this part',context);expect(answer.text).toContain(smartphone.components[2].function);expect(answer.source).toContain('External provider unavailable');expect(answer.kind).toBe('Structured demo data');});
  it('does not invent answers to arbitrary questions',async()=>{expect((await localAI.answerQuestion('Who won the world cup?',context)).text).toContain('cannot answer arbitrary');});
});
describe('identification API',()=>{
  it('accepts metadata and rejects invalid JSON and excessive bodies',async()=>{const good=await POST(new Request('http://localhost/api/identify',{method:'POST',body:JSON.stringify({name:'phone'})}));expect(good.status).toBe(200);expect((await good.json()).provider).toBe('Local metadata matcher');const invalid=await POST(new Request('http://localhost/api/identify',{method:'POST',body:'bad'}));expect(invalid.status).toBe(400);const huge=await POST(new Request('http://localhost/api/identify',{method:'POST',body:'x'.repeat(20001)}));expect(huge.status).toBe(413);});
});
describe('image validation',()=>{
  it('rejects unsupported MIME, spoofed content and oversized images',async()=>{await expect(validateImage(new File(['svg'],'test.svg',{type:'image/svg+xml'}))).rejects.toThrow('JPEG');await expect(validateImage(new File(['text'],'test.png',{type:'image/png'}))).rejects.toThrow('content');await expect(validateImage(new File([new Uint8Array(8*1024*1024+1)],'big.png',{type:'image/png'}))).rejects.toThrow('8 MB');});
  it('validates decoded dimensions and closes the bitmap',async()=>{const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:300,height:200,close}));const file=new File([new Uint8Array([137,80,78,71,13,10,26,10])],'image.png',{type:'image/png'});expect((await validateImage(file)).width).toBe(300);expect(close).toHaveBeenCalled();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:13000,height:200,close}));await expect(validateImage(file)).rejects.toThrow('dimensions');vi.unstubAllGlobals();});
});
