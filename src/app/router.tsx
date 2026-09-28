import { createHashRouter } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { ImportPage } from '../pages/ImportPage';
import { StudyPage } from '../pages/StudyPage';
import { WordsPage } from '../pages/WordsPage';

// GitHub Pages는 SPA fallback이 없으므로 HashRouter를 사용한다.
export const router = createHashRouter([
  { path: '/', element: <HomePage /> },
  { path: '/import', element: <ImportPage /> },
  { path: '/study/:deckId', element: <StudyPage /> },
  { path: '/words', element: <WordsPage /> },
]);
