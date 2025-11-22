// 🎉 校园风社交样式钩子（无业务接口修改）
(() => {
  const toggleActive = (el, cls = 'is-active') => {
    if (!el) return;
    el.classList.toggle(cls);
  };

  const bindLikeButtons = () => {
    document.querySelectorAll('[data-like-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleActive(btn, 'liked');
        const counter = btn.querySelector('[data-like-count]');
        if (counter) {
          const current = parseInt(counter.innerText || '0', 10) || 0;
          counter.innerText = btn.classList.contains('liked') ? current + 1 : Math.max(0, current - 1);
        }
      });
    });
  };

  const bindShareButtons = () => {
    document.querySelectorAll('[data-share-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleActive(btn, 'shared');
        const toast = document.createElement('div');
        toast.className = 'toast-campus bounce-in';
        toast.innerText = '✨ 已准备好分享图与链接';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      });
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    bindLikeButtons();
    bindShareButtons();
  });
})();
