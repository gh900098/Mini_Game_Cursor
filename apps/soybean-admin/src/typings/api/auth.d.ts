declare namespace Api {
  /**
   * namespace Auth
   *
   * backend api module: "auth"
   */
  namespace Auth {
    interface LoginToken {
      access_token: string;
      refreshToken?: string;
    }

    interface UserInfo {
      userId: string;
      userName?: string;
      email?: string;
      name?: string | null;
      mobile?: string | null;
      bio?: string | null;
      description?: string | null;
      remark?: string | null;
      roles: string[];
      buttons: string[];
      currentCompanyId: string | null;
      currentCompanySlug: string | null;
      currentRoleId: string | null;
      currentRoleLevel: number;
      companies: {
        companyId: string;
        companyName: string;
        roleId: string;
        roleName: string;
        permissions: string[];
      }[];
      isSuperAdmin: boolean;
    }
  }
}
