export const getCurrentWeekMonday = () => {
  const now = new Date(); // Uses Europe/Lisbon timezone from the container

  const day = now.getDay(); // 0 = Sunday, 1 = Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  // Create monday point
  const weekStart = new Date(Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + diffToMonday,
    0, 0, 0, 0
  ));

  return weekStart;
};
