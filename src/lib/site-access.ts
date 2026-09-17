export type SiteAccessSettings = {
  allowCollaborators: boolean;
  allowGuildAdministrators: boolean;
  allowManageServer: boolean;
};

export const DEFAULT_SITE_ACCESS_SETTINGS: SiteAccessSettings = {
  allowCollaborators: true,
  allowGuildAdministrators: true,
  allowManageServer: true,
};
