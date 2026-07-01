export default function QuestionHeader({ icon: Icon, eyebrow, title, body }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5" />
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        {body ? <p>{body}</p> : null}
      </div>
    </div>
  );
}
