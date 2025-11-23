import React, { useRef, useMemo } from 'react';
import JoditEditor from 'jodit-react';
import PropTypes from 'prop-types';
import 'jodit/es2015/jodit.min.css';


export const JoditTextEditor = ({ value, onChange, placeholder = 'ברוך הבא לעורך הטקסט' }) => {
  const editor = useRef(null);

  const config = useMemo(() => ({
    direction: 'rtl',
    language: 'he',
    toolbarAdaptive: false,
    minHeight: 600,
    enter: 'DIV',
    height: '100%',
    placeholder: value ? '' : placeholder,
    style: { color: '#000' },
    iframeStyle: `
      .jodit-container {
        text-align: left;
      }
      .jodit-wysiwyg[dir="rtl"] ul,
      .jodit-wysiwyg[dir="rtl"] ol {
        direction: rtl;
        text-align: right;
        padding-right: 30px;
        padding-left: 0;
      }
      .jodit-wysiwyg[dir="rtl"] li {
        direction: rtl;
        text-align: right;
      }
    `,
    uploader: {
      insertImageAsBase64URI: true,
    }
  }), [value, placeholder]);

  return (
    <div className="jodit-wrapper" style={{ width: '100%', margin: 'auto' }}>
      <JoditEditor
        ref={editor}
        value={value}
        config={config}
        onBlur={(newContent) => onChange && onChange(newContent)}
        onChange={(newContent) => {
          // Optional: uncomment if you want onChange to fire on every keystroke
          // onChange && onChange(newContent);
        }}
      />
    </div>
  );
};

JoditTextEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string
};

export default JoditTextEditor;
