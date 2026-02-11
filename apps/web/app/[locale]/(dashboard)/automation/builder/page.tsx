'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  type Node,
  type Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  type Connection,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

import TriggerNode, {
  type TriggerNodeData,
  type TriggerType,
} from '@/components/automation/TriggerNode';
import DelayNode, { type DelayNodeData } from '@/components/automation/DelayNode';
import ActionNode, {
  type ActionNodeData,
  type ActionType,
} from '@/components/automation/ActionNode';
import NodePalette from '@/components/automation/NodePalette';

interface AutomationRule {
  uuid: string;
  name: string;
  description: string | null;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  actionType: ActionType;
  actionConfig: { templateId?: number };
  delayMinutes: number;
  isActive: boolean;
}

const nodeTypes = {
  trigger: TriggerNode,
  delay: DelayNode,
  action: ActionNode,
};

export default function AutomationBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const ruleId = searchParams?.get('ruleId');

  const [ruleName, setRuleName] = useState('Nové pravidlo');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReturnType<typeof Object> | null>(
    null,
  );

  // Load existing rule if editing
  const { data: existingRule } = useQuery({
    queryKey: ['automation-rule', ruleId],
    queryFn: async () => {
      if (!ruleId) return null;
      const response = await apiClient.get<{ data: AutomationRule }>(
        `/api/v1/automation/rules/${ruleId}`,
      );
      return response.data;
    },
    enabled: !!ruleId,
  });

  const handleTriggerChange = useCallback(
    (nodeId: string, triggerType: TriggerType) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, triggerType } } : node,
        ),
      );
    },
    [setNodes],
  );

  const handleDelayChange = useCallback(
    (nodeId: string, delayMinutes: number) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, delayMinutes } } : node,
        ),
      );
    },
    [setNodes],
  );

  const handleActionChange = useCallback(
    (nodeId: string, actionType: ActionType, actionConfig: { templateId?: number }) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, actionType, actionConfig } } : node,
        ),
      );
    },
    [setNodes],
  );

  // Initialize nodes and edges from existing rule
  useEffect(() => {
    if (existingRule) {
      setRuleName(existingRule.name);

      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];

      // Trigger node
      const triggerNode: Node<TriggerNodeData> = {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: {
          triggerType: existingRule.triggerType,
          onChange: (triggerType: TriggerType) => handleTriggerChange('trigger-1', triggerType),
        },
      };
      newNodes.push(triggerNode);

      let lastNodeId = 'trigger-1';
      let yPos = 200;

      // Delay node (if delay > 0)
      if (existingRule.delayMinutes > 0) {
        const delayNode: Node<DelayNodeData> = {
          id: 'delay-1',
          type: 'delay',
          position: { x: 250, y: yPos },
          data: {
            delayMinutes: existingRule.delayMinutes,
            onChange: (delayMinutes: number) => handleDelayChange('delay-1', delayMinutes),
          },
        };
        newNodes.push(delayNode);
        newEdges.push({
          id: `${lastNodeId}-delay-1`,
          source: lastNodeId,
          target: 'delay-1',
          animated: true,
        });
        lastNodeId = 'delay-1';
        yPos += 150;
      }

      // Action node
      const actionNode: Node<ActionNodeData> = {
        id: 'action-1',
        type: 'action',
        position: { x: 250, y: yPos },
        data: {
          actionType: existingRule.actionType,
          actionConfig: existingRule.actionConfig,
          onChange: (actionType: ActionType, config: { templateId?: number }) =>
            handleActionChange('action-1', actionType, config),
        },
      };
      newNodes.push(actionNode);
      newEdges.push({
        id: `${lastNodeId}-action-1`,
        source: lastNodeId,
        target: 'action-1',
        animated: true,
      });

      setNodes(newNodes);
      setEdges(newEdges);
    } else {
      // Default: new rule with trigger and action
      const defaultNodes: Node[] = [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: {
            onChange: (triggerType: TriggerType) => handleTriggerChange('trigger-1', triggerType),
          },
        },
        {
          id: 'action-1',
          type: 'action',
          position: { x: 250, y: 200 },
          data: {
            onChange: (actionType: ActionType, config: { templateId?: number }) =>
              handleActionChange('action-1', actionType, config),
          },
        },
      ];
      const defaultEdges: Edge[] = [
        {
          id: 'trigger-1-action-1',
          source: 'trigger-1',
          target: 'action-1',
          animated: true,
        },
      ];
      setNodes(defaultNodes);
      setEdges(defaultEdges);
    }
  }, [
    existingRule,
    handleTriggerChange,
    handleDelayChange,
    handleActionChange,
    setNodes,
    setEdges,
  ]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true }, eds));
    },
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const newNodeId = `${type}-${Date.now()}`;
      const newNode: Node = {
        id: newNodeId,
        type,
        position,
        data:
          type === 'trigger'
            ? { onChange: (t: TriggerType) => handleTriggerChange(newNodeId, t) }
            : type === 'delay'
              ? { delayMinutes: 0, onChange: (d: number) => handleDelayChange(newNodeId, d) }
              : {
                  onChange: (a: ActionType, c: { templateId?: number }) =>
                    handleActionChange(newNodeId, a, c),
                },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes, handleTriggerChange, handleDelayChange, handleActionChange],
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const saveMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      triggerType: TriggerType;
      actionType: ActionType;
      actionConfig: { templateId?: number };
      delayMinutes: number;
    }) => {
      if (ruleId) {
        await apiClient.put(`/api/v1/automation/rules/${ruleId}`, data);
      } else {
        await apiClient.post('/api/v1/automation/rules', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-rules'] });
      router.push('/automation');
    },
  });

  const handleSave = () => {
    // Extract data from nodes
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    const delayNode = nodes.find((n) => n.type === 'delay');
    const actionNode = nodes.find((n) => n.type === 'action');

    if (!triggerNode || !actionNode) {
      alert('Pravidlo musí obsahovat alespoň trigger a akci');
      return;
    }

    const triggerData = triggerNode.data as TriggerNodeData;
    const delayData = delayNode?.data as DelayNodeData | undefined;
    const actionData = actionNode.data as ActionNodeData;

    if (!triggerData.triggerType) {
      alert('Vyberte typ triggeru');
      return;
    }

    if (!actionData.actionType) {
      alert('Vyberte typ akce');
      return;
    }

    saveMutation.mutate({
      name: ruleName,
      triggerType: triggerData.triggerType,
      actionType: actionData.actionType,
      actionConfig: actionData.actionConfig || {},
      delayMinutes: delayData?.delayMinutes || 0,
    });
  };

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/automation')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Input
            value={ruleName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRuleName(e.target.value)}
            className="w-[300px]"
            placeholder="Název pravidla"
          />
        </div>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? 'Ukládání...' : 'Uložit pravidlo'}
        </Button>
      </div>

      <div ref={reactFlowWrapper} className="flex flex-1 overflow-hidden rounded-lg border">
        <NodePalette onDragStart={onDragStart} />
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
