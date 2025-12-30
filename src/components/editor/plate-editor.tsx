'use client';

import * as React from 'react';
import { useCallback } from 'react';

import { normalizeNodeId, Value } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { EditorKit } from '@/components/editor/editor-kit';
import { SettingsDialog } from '@/components/editor/settings-dialog';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { cn } from '@/lib/utils';

interface PlateEditorProps {
  value?: Value | string;
  onChange?: (value: Value | string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  placeholder?: string;
}

// Default empty value for the editor
const defaultValue: Value = normalizeNodeId([
  { type: 'p', children: [{ text: '' }] },
]);

// Convert markdown-like content to Plate value
function contentToPlateValue(content: string): Value {
  if (!content) {
    return defaultValue;
  }

  const lines = content.split('\n');
  const nodes: any[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      nodes.push({ type: 'h1', children: [{ text: line.slice(2) }] });
    } else if (line.startsWith('## ')) {
      nodes.push({ type: 'h2', children: [{ text: line.slice(3) }] });
    } else if (line.startsWith('### ')) {
      nodes.push({ type: 'h3', children: [{ text: line.slice(4) }] });
    } else if (line.startsWith('> ')) {
      nodes.push({ type: 'blockquote', children: [{ children: [{ text: line.slice(2) }], type: 'p' }] });
    } else if (line.startsWith('---')) {
      nodes.push({ type: 'hr', children: [{ text: '' }] });
    } else if (line.trim() === '') {
      nodes.push({ type: 'p', children: [{ text: '' }] });
    } else {
      nodes.push({ type: 'p', children: [{ text: line }] });
    }
  }

  if (nodes.length === 0) {
    nodes.push({ type: 'p', children: [{ text: '' }] });
  }

  return normalizeNodeId(nodes);
}

// Convert Plate value back to markdown-like string
function plateValueToContent(value: Value): string {
  const lines: string[] = [];

  for (const node of value) {
    const getText = (children: any[]): string => {
      return children
        ?.map((child: any) => {
          if (child.text !== undefined) return child.text;
          if (child.children) return getText(child.children);
          return '';
        })
        .join('') || '';
    };

    const text = getText((node as any).children || []);

    switch ((node as any).type) {
      case 'h1':
        lines.push(`# ${text}`);
        break;
      case 'h2':
        lines.push(`## ${text}`);
        break;
      case 'h3':
        lines.push(`### ${text}`);
        break;
      case 'blockquote':
        lines.push(`> ${text}`);
        break;
      case 'hr':
        lines.push('---');
        break;
      default:
        lines.push(text);
    }
  }

  return lines.join('\n');
}

export function PlateEditor({
  value,
  onChange,
  isFullscreen = false,
  onToggleFullscreen,
  placeholder = 'Start writing...',
}: PlateEditorProps) {
  // Determine if we're dealing with string or Value type
  const isStringValue = typeof value === 'string';

  // Convert string to Value if needed
  const initialValue = React.useMemo(() => {
    if (!value) return defaultValue;
    if (isStringValue) return contentToPlateValue(value as string);
    return value as Value;
  }, [value, isStringValue]);

  const editor = usePlateEditor({
    plugins: EditorKit,
    value: initialValue,
  });

  // Handle value changes
  const handleChange = useCallback(
    ({ value: newValue }: { value: Value }) => {
      if (onChange) {
        // Return in the same format as the input
        if (isStringValue) {
          const content = plateValueToContent(newValue);
          onChange(content);
        } else {
          onChange(newValue);
        }
      }
    },
    [onChange, isStringValue]
  );

  return (
    <div className={cn(
      'plate-editor-wrapper flex h-full flex-col bg-background text-foreground',
      isFullscreen && 'fixed inset-0 z-50'
    )}>
      <Plate editor={editor} onChange={handleChange}>
        <EditorContainer className="min-h-0 flex-1 overflow-y-auto">
          <Editor variant="demo" placeholder={placeholder} />
        </EditorContainer>

        <SettingsDialog />
      </Plate>
    </div>
  );
}
