import path from 'path';

export const DATA_FILE = path.join(process.cwd(), 'data.json');
export const USERS_FILE = path.join(process.cwd(), 'users.json');
export const SESSION_DAYS = 30;
export const ADMIN_USERNAME = 'AdminABP11LL';
export const ADMIN_PASSWORD = 'AdMIN1!';

export const DEFAULT_DATA = {
  ranked: [
    {
      uid: 'level-1',
      name: 'ABPLL blade',
      levelId: '147308748',
      by: 'GDarisu',
      verifiedBy: 'GDarisu',
      video: 'https://medal.tv/games/geometry-dash/clips/nml9jbtYOXinjm4GN?invite=cr-MSw3emwsMjYyNjMxMjgy',
      image: '3D64D0A5-1DF1-4FE1-97E5-AAFB044407E5.png',
      victors: []
    },
    {
      uid: 'level-2',
      name: 'The falling ABPLL',
      levelId: '147314808',
      by: 'GDarisu',
      verifiedBy: 'GDarisu',
      video: 'https://medal.tv/games/geometry-dash/clips/nlWXDex0oIITAjFut?invite=cr-MSx1dXMsMjYyNjMxMjgy',
      image: 'E43200F8-846C-4B37-9EC6-DE35F4E5BDD3.png',
      victors: []
    },
    {
      uid: 'level-3',
      name: 'ABPLL aura',
      levelId: '147309593',
      by: 'GDarisu',
      verifiedBy: 'GDarisu',
      video: 'https://medal.tv/games/geometry-dash/clips/nlV8twNUQ_O8xaI0N?invite=cr-MSxidjEsMjYyNjMxMjgy',
      image: 'abpll-aura.png',
      victors: ['VegasZ 100%']
    },
    {
      uid: 'level-4',
      name: 'Decaying abpll',
      levelId: '147315867',
      by: 'GDarisu',
      verifiedBy: 'GDarisu',
      video: 'https://medal.tv/games/geometry-dash/clips/nlXaXOrCLNgHOMJ4X?invite=cr-MSxQSjEsMjYyNjMxMjgy',
      image: '5E9B0BB9-6325-469B-9B9D-8A627904FB93.png',
      victors: ['VegasZ 100%']
    }
  ],
  uploaded: [],
  completions: [],
  announcements: []
};
