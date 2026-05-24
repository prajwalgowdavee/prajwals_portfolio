export function Footer() {
  return (
    <footer className="journey-footer">
      <p className="journey-footer__name">* Prajwal Gowda *</p>
      <p className="journey-footer__quote">"The journey continues."</p>
      <p className="journey-footer__meta">Made with intention | Powered by curiosity</p>
      <p className="journey-footer__meta">{new Date().getFullYear()} | All rights reserved</p>
      <a href="#hero-road" className="journey-footer__top">
        Back to top
      </a>
    </footer>
  );
}
