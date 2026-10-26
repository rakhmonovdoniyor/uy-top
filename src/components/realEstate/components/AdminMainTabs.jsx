function AdminMainTabs({ activeAdminTab, adminTabs, setActiveAdminTab, t }) {
  return (
    <div className="admin-main-tabs" aria-label={t("admin.tabsLabel")}>
      {adminTabs.map((tab) => (
        <button
          className={activeAdminTab === tab.value ? "active" : ""}
          key={tab.value}
          onClick={() => setActiveAdminTab(tab.value)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default AdminMainTabs;
