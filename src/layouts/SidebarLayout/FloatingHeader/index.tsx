import React from 'react';
import { useSelector } from 'react-redux'
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Stack, Box, Button, Hidden, ListItemText, Typography, styled, alpha, lighten } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';

import { SidebarContext } from 'contexts/SidebarContext';
import { OverPageContext } from 'contexts/OverPageContext';
import { HiveApi } from 'services/HiveApi'
import { selectPublicChannels } from 'redux/slices/channel';
import { selectPublicPosts } from 'redux/slices/post';
import { SettingMenuArray, getAppPreference, reduceDIDstring, getMergedArray } from 'utils/common'
import { LocalDB, QueryStep } from 'utils/db';

const HeaderWrapper = styled(Box)(
  ({ theme }) => `
        height: ${theme.header.height};
        color: ${theme.header.textColor};
        padding: ${theme.spacing(0, 2)};
        right: ${theme.rightPanel.width};
        z-index: 6;
        background-color: ${alpha(theme.header.background, 0.95)};
        backdrop-filter: blur(3px);
        position: fixed;
        justify-content: space-between;
        width: 100%;
        display: flex;
        align-items: center;
        @media (min-width: ${theme.breakpoints.values.lg}px) {
            // margin-left: calc(${theme.sidebarChannel.width} + ${theme.sidebar.width});
            // margin-right: ${theme.rightPanel.width};
            left: calc(${theme.sidebarChannel.width} + ${theme.sidebar.width});
            width: auto;
        }
        box-shadow: ${
          theme.palette.mode === 'dark'
            ? `0 1px 0 ${alpha(
                lighten(theme.colors.primary.main, 0.7),
                0.15
              )}, 0px 2px 8px -3px rgba(0, 0, 0, 0.2), 0px 5px 22px -4px rgba(0, 0, 0, .1)`
            : `0px 2px 8px -3px ${alpha(
                theme.colors.alpha.black[100],
                0.2
              )}, 0px 5px 22px -4px ${alpha(
                theme.colors.alpha.black[100],
                0.1
              )}`
        };
`
);
function FloatingHeader() {
  const { pageType, setPageType, closeOverPage } = React.useContext(OverPageContext);
  const { queryStep, focusedChannelId, selfChannels, subscribedChannels, postsInSelf, postsInSubs, userInfo } = React.useContext(SidebarContext);
  const location = useLocation()
  const { pathname } = useLocation()
  const { channel_id } = (location.state || {}) as any
  const navigate = useNavigate();
  const params = useParams()
  const hiveApi = new HiveApi()
  const feedsDid = sessionStorage.getItem('FEEDS_DID')
  const postsInHome = getMergedArray(postsInSubs)
  const publicChannels = useSelector(selectPublicChannels)
  const publicPosts = useSelector(selectPublicPosts)
  const [focusedChannel, setFocusedChannel] = React.useState({})
  const [postCountInFocus, setPostCountInFocus] = React.useState(0)

  React.useEffect(()=>{
    if(queryStep && focusedChannelId) {
      LocalDB.get(focusedChannelId.toString())
        .then(doc=>setFocusedChannel(doc))
      if(queryStep>=QueryStep.post_data) {
        LocalDB.find({
          selector: {
            channel_id: focusedChannelId,
            table_type: 'post'
          }
        })
          .then(res=>setPostCountInFocus(res.docs.length))
      }
    }
  }, [queryStep, focusedChannelId])

  const handleBack = (e) => {
    if(pathname.startsWith('/setting')) {
      navigate('/home')
    }
    else
      window.history.back()
  }
  
  const getActionText = () => {
    let primaryText = ""
    let secondaryText = ""
    
    if(pathname.startsWith('/setting')) {
      const suburl = pathname.substring(8)
      const menuType = SettingMenuArray.find(item=>item.to===suburl)
      const description = menuType?menuType.description:''

      primaryText = "Settings"
      secondaryText = description
    }
    else if(pathname.startsWith('/channel/add') || pageType==='AddChannel')
      primaryText = "Add Channel"
    else if(pathname.startsWith('/channel') && focusedChannelId) {
      primaryText = focusedChannel['name']
      secondaryText = `${postCountInFocus} posts`
    }
    else if(pathname.startsWith('/subscription/channel') && channel_id) {
      const activeChannel = (subscribedChannels.find(item=>item.channel_id==channel_id) || {}) as any
      const postsInActiveChannel = postsInSubs[channel_id] || []
      primaryText = activeChannel.name
      secondaryText = `${postsInActiveChannel.length} posts`
    }
    else if(pathname.startsWith('/explore/channel') && channel_id) {
      const activeChannel = (publicChannels[channel_id] || {}) as any
      const postsInActiveChannel = publicPosts[channel_id] || []
      primaryText = activeChannel.name
      secondaryText = `${postsInActiveChannel.length} posts`
    }
    else if(pathname.startsWith('/post/')) {
      const focusedPost = postsInHome.find(item=>item.post_id==params.post_id)
      primaryText = "Post"
      secondaryText = `${focusedPost.commentData?focusedPost.commentData.length:0} comments`
    }
    else if(pathname.startsWith('/profile')) {
      primaryText = userInfo['name'] || `@${reduceDIDstring(feedsDid)}`
      // secondaryText = "0 post"
    }
    if(primaryText) {
      const listItemProps = { primary: <Typography variant='subtitle2' color='text.primary' textAlign='left'>{primaryText}</Typography> }
      if(secondaryText)
        listItemProps['secondary'] = secondaryText
      return <ListItemText {...listItemProps}/>
    }
    return ""
  }

  const backBtnText = React.useMemo(() => getActionText(), [pageType, pathname, focusedChannel, postCountInFocus, channel_id])
  return (
    <>
      <Hidden lgDown>
        <Box sx={{pb: (theme)=>`${theme.header.height}`}}>
          <HeaderWrapper>
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
            >
              {
                !!backBtnText&&
                <Button
                  color="inherit"
                  startIcon={<ArrowBack />}
                  onClick={handleBack}
                  sx={{textAlign: 'left'}}
                >
                  {backBtnText}
                </Button>
              }
            </Stack>
          </HeaderWrapper>
        </Box>
      </Hidden>
    </>
  );
}

export default FloatingHeader;
