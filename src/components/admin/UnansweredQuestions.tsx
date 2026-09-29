'use client';

import { formatDistanceToNow } from 'date-fns';

interface Question {
  id: string;
  question: string;
  createdAt: Date | string;
}

export function UnansweredQuestions({ questions }: { questions: Question[] }) {
  return (
    <div>
      <h2 className="font-semibold text-gray-900 mb-1">Unanswered Questions</h2>
      <p className="text-xs text-gray-400 mb-3">
        Questions the AI couldn&apos;t answer — consider adding this info to your knowledge base.
      </p>

      {questions.length === 0 ? (
        <p className="text-sm text-gray-400">No unanswered questions yet. Great job!</p>
      ) : (
        <ul className="space-y-2">
          {questions.map((q) => (
            <li
              key={q.id}
              className="flex items-start justify-between gap-4 bg-white border rounded-xl px-4 py-3"
            >
              <p className="text-sm text-gray-800">&ldquo;{q.question}&rdquo;</p>
              <span className="text-xs text-gray-400 shrink-0">
                {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
