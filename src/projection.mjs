export function plainText(text) {
  return text.replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-*+]\s+(?:\[[ xX]\]\s*)?|\d+\.\s+)/gm, '')
    .replace(/(\*\*|__|~~|`)/g, '').replace(/\s+/g, ' ').trim();
}

export function projectEvent(event) {
  if (event.type === 'session/title' && event.data.source?.kind !== 'fallback') return { title: event.data.title.slice(0, 72) };
  if (event.type === 'todo/write') return { todos: event.data.todos.map(item => ({ content: item.content.slice(0, 200), status: item.status })) };
  if (event.type === 'assistant/message' && !event.data.interrupted) {
    const text = event.data.message.content.filter(block => block.type === 'text').map(block => block.text).join(' ');
    if (text.trim()) return { summary: plainText(text).slice(0, 600) };
  }
  if (event.type === 'turn/start') return { status: 'running' };
  if (event.type === 'turn/end') return { status: 'idle' };
  return null;
}
