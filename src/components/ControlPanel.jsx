function ControlPanel({ onAssignDriver, t }) {
  const handleAutoDispatch = () => {
    alert(t.btnAutoDispatch + ' - 之後可以接真正的演算法服務');
  };

  return (
    <div className="panel control-panel">
      <h2>{t.operationsTitle}</h2>
      <button onClick={onAssignDriver}>
        {t.btnAssignDriver}
      </button>
      <button onClick={handleAutoDispatch} style={{ marginLeft: '8px' }}>
        {t.btnAutoDispatch}
      </button>
    </div>
  );
}

export default ControlPanel;
