import React, { useState, createContext, Dispatch } from 'react';
type SidebarContext = {
  sidebarToggle: any;
  selfChannels: any;
  subscribedChannels: any;
  selectedChannel: any;
  walletAddress: any;
  publishPostNumber: number;
  updateChannelNumber: number;
  postsInSelf: any;
  postsInSubs: any;
  subscriberInfo: any;
  myAvatar: any;
  userInfo: any;
  queryStep: any;
  queryPublicStep: any;
  queryFlag: any;
  queryPublicFlag: any;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  setSelfChannels: Dispatch<any>;
  setSubscribedChannels: Dispatch<any>;
  setSelectChannel: Dispatch<any>;
  setWalletAddress: Dispatch<any>;
  setPublishPostNumber: Dispatch<any>;
  setUpdateChannelNumber: Dispatch<any>;
  setPostsInSelf: Dispatch<any>;
  setPostsInSubs: Dispatch<any>;
  setSubscriberInfo: Dispatch<any>;
  setMyAvatar: Dispatch<any>;
  setUserInfo: Dispatch<any>;
  setQueryStep: Dispatch<any>;
  setQueryPublicStep: Dispatch<any>;
  setQueryFlag: Dispatch<any>;
  setQueryPublicFlag: Dispatch<any>;
};

// eslint-disable-next-line @typescript-eslint/no-redeclare
export const SidebarContext = createContext<SidebarContext>(
  {} as SidebarContext
);

export const SidebarProvider = (props) => {
  
  const [sidebarToggle, setSidebarToggle] = useState(false);
  const [selfChannels, setSelfChannels] = useState([]);
  const [subscribedChannels, setSubscribedChannels] = useState([]);
  const [selectedChannel, setSelectChannel] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [publishPostNumber, setPublishPostNumber] = useState(0);
  const [updateChannelNumber, setUpdateChannelNumber] = useState(0);
  const [postsInSelf, setPostsInSelf] = useState({});
  const [postsInSubs, setPostsInSubs] = useState({});
  const [myAvatar, setMyAvatar] = useState('');
  const [subscriberInfo, setSubscriberInfo] = useState({});
  const [userInfo, setUserInfo] = useState('');
  const [queryStep, setQueryStep] = useState(0);
  const [queryPublicStep, setQueryPublicStep] = useState(0);
  const [queryFlag, setQueryFlag] = useState(0);
  const [queryPublicFlag, setQueryPublicFlag] = useState(0);

  const toggleSidebar = () => {
    setSidebarToggle(!sidebarToggle);
  };
  const closeSidebar = () => {
    setSidebarToggle(false);
  };

  return (
    <SidebarContext.Provider
      value={{ 
        sidebarToggle, 
        selfChannels, 
        subscribedChannels, 
        selectedChannel,
        walletAddress,
        publishPostNumber,
        updateChannelNumber,
        postsInSelf,
        postsInSubs,
        myAvatar,
        subscriberInfo,
        userInfo,
        queryStep,
        queryPublicStep,
        queryFlag,
        queryPublicFlag,
        toggleSidebar, 
        closeSidebar, 
        setSelfChannels, 
        setSubscribedChannels, 
        setSelectChannel,
        setWalletAddress,
        setPublishPostNumber,
        setUpdateChannelNumber,
        setPostsInSelf,
        setPostsInSubs,
        setSubscriberInfo,
        setMyAvatar,
        setUserInfo,
        setQueryStep,
        setQueryPublicStep,
        setQueryFlag,
        setQueryPublicFlag
      }}
    >
      {props.children}
    </SidebarContext.Provider>
  );
};
