/**
 * 마크다운을 HTML로 변환
 * 블로그 플랫폼 발행용
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown;

  // 제목 (# -> <h1>, ## -> <h2>, etc.)
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

  // 강조 (**bold**, *italic*)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 링크 [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // 코드 블록 (``` ... ```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // 인라인 코드 (`code`)
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // 줄바꿈 -> <br>
  html = html.replace(/\n/g, '<br>');

  // 단락 처리 (연속된 <br> -> <p>)
  html = html.replace(/(<br>){2,}/g, '</p><p>');
  html = '<p>' + html + '</p>';

  // 정리: 중첩된 p 태그 제거
  html = html.replace(/<p><h/g, '<h');
  html = html.replace(/<\/h><p>/g, '</h>');

  return html.trim();
}
