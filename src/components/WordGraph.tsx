'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { Loader2, ArrowLeft, ZoomIn, ZoomOut, Maximize2, Zap } from 'lucide-react';
import { Button } from './ui/core';
import * as d3 from 'd3';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  answer?: string;
  type: 'word' | 'unit' | 'library';
  color: string;
  val: number; // radius
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  type: 'hierarchy' | 'semantic';
}

export default function WordGraph({ onBack }: { onBack: () => void }) {
  const { lang } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  
  // D3 Transition state (shared between d3 events and react render)
  const d3Transform = useRef(d3.zoomIdentity);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  useEffect(() => {
    fetchGraphData();
  }, []);

  const fetchGraphData = async () => {
    setLoading(true);
    const { data: cards } = await supabase.from('cards').select('id, prompt, answer, unit_id').limit(150);
    const { data: units } = await supabase.from('library_units').select('id, title, library_id');
    const { data: libs } = await supabase.from('libraries').select('id, title');
    const { data: dbRelations } = await supabase.from('card_relations').select('card_a_id, card_b_id, relation_type');

    if (!cards) { setLoading(false); return; }

    const newNodes: GraphNode[] = [];
    const newLinks: GraphLink[] = [];

    // 1. Libraries (Hubs)
    libs?.forEach(lib => {
      newNodes.push({
        id: lib.id,
        label: lib.title,
        type: 'library',
        color: 'var(--brand-gold)',
        val: 20
      });
    });

    // 2. Units (Branches)
    units?.forEach(unit => {
      newNodes.push({
        id: unit.id,
        label: unit.title,
        type: 'unit',
        color: 'var(--text-muted)',
        val: 14
      });
      if (unit.library_id) {
        newLinks.push({ source: unit.library_id, target: unit.id, type: 'hierarchy' });
      }
    });

    // 3. Words (Leaves)
    cards.forEach(card => {
      newNodes.push({
        id: card.id,
        label: card.prompt,
        answer: card.answer,
        type: 'word',
        color: 'var(--text-primary)',
        val: 8
      });
      if (card.unit_id) {
        newLinks.push({ source: card.unit_id, target: card.id, type: 'hierarchy' });
      }
    });

    // 4. BACKEND SEMANTIC LINKS
    dbRelations?.forEach(rel => {
      newLinks.push({ source: rel.card_a_id, target: rel.card_b_id, type: 'semantic' });
    });

    setNodes(newNodes);
    setLinks(newLinks);
    setLoading(false);
  };

  useEffect(() => {
    if (loading || !nodes.length || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simulation Setup
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(d => d.type === 'hierarchy' ? 100 : 70).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-250))
      .force('center', d3.forceCenter(0, 0))
      .force('collision', d3.forceCollide().radius(d => (d as GraphNode).val + 20));

    simulationRef.current = simulation;

    // Interaction Behaviors
    const zoomBehavior = d3.zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', (event) => {
        d3Transform.current = event.transform;
      });

    // Initialize zoom to center
    if (d3Transform.current.x === 0 && d3Transform.current.y === 0) {
      const initialTransform = d3.zoomIdentity
        .translate(canvas.width / 2, canvas.height / 2)
        .scale(0.8);
      d3.select(canvas).call(zoomBehavior.transform as any, initialTransform);
      d3Transform.current = initialTransform;
    }

    const dragBehavior = d3.drag<HTMLCanvasElement, GraphNode>()
      .subject((event) => {
        const x = d3Transform.current.invertX(event.x);
        const y = d3Transform.current.invertY(event.y);
        return simulation.find(x, y, 60 / d3Transform.current.k) as GraphNode;
      })
      .on('start', (event) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on('drag', (event) => {
        event.subject.fx = d3Transform.current.invertX(event.x);
        event.subject.fy = d3Transform.current.invertY(event.y);
      })
      .on('end', (event) => {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });

    // Dedicated Click Handler for selection (Avoid collision with drag)
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const x = d3Transform.current.invertX(mouseX);
      const y = d3Transform.current.invertY(mouseY);
      
      const node = simulation.find(x, y, 60 / d3Transform.current.k);
      if (node) {
        setSelectedNode(node);
        // Zoom to node
        const zoom = d3.zoom().on('zoom', (event) => { d3Transform.current = event.transform; });
        const nextTransform = d3.zoomIdentity
          .translate(canvas.width / 2 - node.x! * 2, canvas.height / 2 - node.y! * 2)
          .scale(2);
        
        d3.select(canvas).transition().duration(750)
          .call(zoom.transform as any, nextTransform);
      }
    };

    canvas.addEventListener('click', handleClick);

    d3.select(canvas)
      .call(zoomBehavior as any)
      .call(dragBehavior as any);

    let animationId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      
      const transform = d3Transform.current;
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.k, transform.k);

      // Draw Links
      links.forEach(link => {
        const s = link.source as GraphNode;
        const t = link.target as GraphNode;
        if (!s.x || !s.y || !t.x || !t.y) return;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        
        if (link.type === 'hierarchy') {
          ctx.strokeStyle = 'rgba(150, 150, 150, 0.08)';
          ctx.lineWidth = 1;
        } else {
          const isRelated = selectedNode && (s.id === selectedNode.id || t.id === selectedNode.id);
          ctx.strokeStyle = isRelated ? 'rgba(221, 184, 115, 0.4)' : 'rgba(221, 184, 115, 0.03)';
          ctx.lineWidth = isRelated ? 2 : 1;
        }
        ctx.stroke();
      });

      // Draw Nodes
      nodes.forEach(node => {
        if (!node.x || !node.y) return;

        const isSelected = selectedNode?.id === node.id;
        
        ctx.beginPath();
        if (node.type === 'library') {
          ctx.rect(node.x - node.val, node.y - node.val, node.val * 2, node.val * 2);
        } else {
          ctx.arc(node.x, node.y, node.val, 0, Math.PI * 2);
        }
        
        ctx.fillStyle = isSelected ? 'var(--brand-gold)' : node.color;
        ctx.shadowBlur = isSelected ? 15 : 0;
        ctx.shadowColor = 'var(--brand-gold)';
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'var(--primary)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Labels
        const showLabel = transform.k > 0.6 || node.type !== 'word' || isSelected;
        if (showLabel) {
          const fontSize = node.type === 'library' ? 14 : node.type === 'unit' ? 12 : 10;
          ctx.font = `${node.type === 'library' ? '900' : '600'} ${Math.max(fontSize, fontSize / transform.k)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          
          ctx.strokeStyle = 'var(--primary)';
          ctx.lineWidth = 4;
          ctx.strokeText(node.label, node.x, node.y + node.val + 20);
          
          ctx.fillStyle = isSelected ? 'var(--brand-gold)' : node.type === 'library' ? 'var(--text-primary)' : 'var(--text-muted)';
          ctx.fillText(node.label, node.x, node.y + node.val + 20);
        }
      });

      ctx.restore();
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationId);
      simulation.stop();
      canvas.removeEventListener('click', handleClick);
    };
  }, [nodes, links, loading, selectedNode]);

  const handleManualZoom = (factor: number) => {
    if (!canvasRef.current) return;
    const canvas = d3.select(canvasRef.current);
    const zoom = d3.zoom().on('zoom', (event) => { d3Transform.current = event.transform; });
    // @ts-ignore
    canvas.transition().duration(300).call(zoom.scaleBy as any, factor);
  };

  const resetZoom = () => {
    if (!canvasRef.current) return;
    const canvas = d3.select(canvasRef.current);
    const zoom = d3.zoom().on('zoom', (event) => { d3Transform.current = event.transform; });
    
    const transform = d3.zoomIdentity
      .translate(canvasRef.current.width / 2, canvasRef.current.height / 2)
      .scale(0.8);

    // @ts-ignore
    canvas.transition().duration(500).call(zoom.transform as any, transform);
  };

  return (
    <div className="fixed inset-0 bg-primary z-50 flex flex-col pt-16 overflow-hidden">
      {/* UI Overlay */}
      <div className="absolute top-20 left-6 z-10 pointer-events-none select-none">
        <button 
          onClick={onBack} 
          className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest pointer-events-auto mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {lang === 'EN' ? 'Back' : '戻る'}
        </button>
        
        <div className="bg-surface/80 border border-text-muted/10 p-5 max-w-xs shadow-2xl backdrop-blur-md pointer-events-auto">
          <div className="flex items-center gap-2 mb-2">
             <Zap className="w-4 h-4 text-brand-gold" />
             <h2 className="text-sm font-black text-text-primary uppercase tracking-[0.2em]">
               {lang === 'EN' ? 'Cognitive Graph' : 'ナレッジ・ツリー'}
             </h2>
          </div>
          <p className="text-[10px] font-mono text-text-muted uppercase tracking-widest leading-relaxed mb-4">
            {lang === 'EN' ? 'Your vocabulary family tree. Grab nodes to physics-test. Scroll to zoom.' : '語彙の家系図。ノードを掴んで物理チェック。拡大・縮小。'}
          </p>
          
          {selectedNode && (
            <div className="mt-4 pt-4 border-t border-text-muted/10 animate-in fade-in slide-in-from-left-2">
              <span className="text-[9px] font-mono text-brand-gold uppercase tracking-widest block mb-1">SELECTED {selectedNode.type}</span>
              <p className="text-base font-bold text-text-primary leading-tight mb-2">{selectedNode.label}</p>
              {selectedNode.answer && (
                <p className="text-xs text-text-muted font-normal leading-relaxed italic border-l-2 border-brand-gold/30 pl-3">
                  {selectedNode.answer}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Button variant="ghost" className="h-8 px-3 text-[9px] font-bold" onClick={() => setSelectedNode(null)}>
                  CLEAR
                </Button>
                {selectedNode.type === 'word' && (
                  <div className="text-[9px] font-mono text-brand-gold flex items-center gap-1 ml-auto">
                    <Zap className="w-2.5 h-2.5" /> 
                    {links.filter(l => l.type === 'semantic' && ((l.source as any).id === selectedNode.id || (l.target as any).id === selectedNode.id)).length} RELATIONS
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={typeof window !== 'undefined' ? window.innerWidth : 1200}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
        className="flex-1 cursor-grab active:cursor-grabbing"
      />

      <div className="absolute bottom-8 right-8 z-10 flex flex-col gap-2">
        <button onClick={() => handleManualZoom(1.2)} className="p-3 bg-surface border border-text-muted/10 hover:border-brand-gold text-text-muted hover:text-brand-gold transition-all shadow-xl">
          <ZoomIn className="w-5 h-5" />
        </button>
        <button onClick={() => handleManualZoom(0.8)} className="p-3 bg-surface border border-text-muted/10 hover:border-brand-gold text-text-muted hover:text-brand-gold transition-all shadow-xl">
          <ZoomOut className="w-5 h-5" />
        </button>
        <button onClick={resetZoom} className="p-3 bg-surface border border-text-muted/10 hover:border-brand-gold text-text-muted hover:text-brand-gold transition-all shadow-xl">
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>
      
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/50 backdrop-blur-sm z-50">
          <Loader2 className="w-10 h-10 animate-spin text-brand-gold" />
        </div>
      )}
    </div>
  );
}
