function EmptyState({ text, tone = 'neutral' }) {
  return <div className={`empty-state empty-${tone}`}>{text}</div>;
}

export default EmptyState;
