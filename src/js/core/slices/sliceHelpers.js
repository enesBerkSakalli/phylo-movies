export const renderTreeControllers = (controllers) => {
  if (!Array.isArray(controllers)) return;
  controllers.forEach((c) => c?.renderAllElements?.());
};
