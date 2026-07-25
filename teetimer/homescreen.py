"""Make the app look like a real app when saved to an iPhone home screen.

Streamlit's `page_icon` only sets the browser-tab favicon. iOS ignores that
and looks for `<link rel="apple-touch-icon">` in the document head, falling
back to a screenshot of the page when it can't find one -- which is why
home-screen shortcuts to Streamlit apps look blank.

`st.markdown` writes into the body, and Streamlit strips <script> from it, so
the tags are injected from a components iframe reaching up into the parent
document. The icon travels as a data: URI, so nothing needs hosting.
"""
from __future__ import annotations

import base64
import json
from functools import lru_cache
from pathlib import Path

import streamlit.components.v1 as components

ICON = Path(__file__).resolve().parent.parent / "assets" / "icon-180.png"


@lru_cache(maxsize=4)
def _data_uri(path: str) -> str:
    return "data:image/png;base64," + base64.b64encode(Path(path).read_bytes()).decode()


def apply(title: str, icon_path: Path = ICON, theme_color: str = "#0b4a2c") -> None:
    """Inject the iOS web-app tags into the parent document's <head>."""
    if not icon_path.exists():
        return
    payload = json.dumps({
        "icon": _data_uri(str(icon_path)),
        "title": title,
        "theme": theme_color,
    })
    components.html(
        f"""
<script>
(function () {{
  var cfg = {payload};
  var head = window.parent.document.head;
  if (!head || head.querySelector('link[rel="apple-touch-icon"]')) return;

  function tag(name, attrs) {{
    var el = window.parent.document.createElement(name);
    Object.keys(attrs).forEach(function (k) {{ el.setAttribute(k, attrs[k]); }});
    head.appendChild(el);
  }}

  tag('link', {{rel: 'apple-touch-icon', sizes: '180x180', href: cfg.icon}});
  tag('link', {{rel: 'icon', type: 'image/png', href: cfg.icon}});
  // Label under the icon, and a standalone (chrome-less) launch.
  tag('meta', {{name: 'apple-mobile-web-app-title', content: cfg.title}});
  tag('meta', {{name: 'apple-mobile-web-app-capable', content: 'yes'}});
  tag('meta', {{name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent'}});
  tag('meta', {{name: 'theme-color', content: cfg.theme}});
}})();
</script>
""",
        height=0,
    )
