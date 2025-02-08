declare var Vue: {
  createApp: (o: { setup: () => void }) => {
    mount: (id: string) => void;
  };
  ref: <T>(id: T) => { value: T };
};

declare let favoritesUrl: string;
declare let favoritesType: "html" | "json";

type folderType = {
  type: "folder" | "url";
  icon?: string;
  name: string;
  url?: string;
  children?: folderType[];
  id: number;
};
