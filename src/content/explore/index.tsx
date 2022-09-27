import React from 'react'
import { Box, Typography, Tabs, Tab, Stack, Container, InputAdornment, Grid } from '@mui/material';
import SearchTwoToneIcon from '@mui/icons-material/SearchTwoTone';

import TabPanel from 'src/components/TabPanel'
import ChannelCard from 'src/components/ChannelCard'
import PostTextCard from 'src/components/PostCard/PostTextCard'
import PostImgCard from 'src/components/PostCard/PostImgCard'
import InputOutline from 'src/components/InputOutline'
import { SidebarContext } from 'src/contexts/SidebarContext';

function Explore() {
  const { selfChannels } = React.useContext(SidebarContext);
  const [tabValue, setTabValue] = React.useState(0);
  
  const handleChangeTab = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const tempchannel = {name: 'MMA Lover', avatarImg: '/twitter.png', intro: 'Good weather today in Osaka! Hmm... where should I eat in Tennouji? Any recommendations? I’m thinking of eating raw sushi for the first time though...I hope it’s gonna be alright haha#osaka #japan #spring'}
  const tempost = {created_at: 1664166498000}
  const tempostcontent = {
    content: 'Good weather today in Osaka! Hmm... where should I eat in Tennouji? Any recommendations? I’m thinking of eating raw sushi for the first time though...I hope it’s gonna be alright haha#osaka #japan #spring',
    avatar: {
      name: 'hames',
      src: ''
    },
    primaryName: 'Test Channel',
    secondaryName: '@Hames',
  }
  return (
    <Container sx={{ mt: 3 }} maxWidth={false}>
      <Stack direction="row" spacing={4}>
        <Tabs
            variant="scrollable"
            scrollButtons="auto"
            textColor="primary"
            indicatorColor="primary"
            value={tabValue}
            onChange={handleChangeTab}
            aria-label="basic tabs example"
            sx={{
              textAlign: 'center', display: 'block'
            }}
          >
            <Tab label="All" />
            <Tab label="Channels" />
            <Tab label="Posts" />
            <Tab label="Hashtags" />
            <Tab label="NFTs" />
        </Tabs>
        <InputOutline
          type="text"
          placeholder="Search"
          size="small"
          startAdornment={
            <InputAdornment position="start">
              <SearchTwoToneIcon />
            </InputAdornment>
          }
          style={{flexGrow: 1}}
        />
      </Stack>
      <TabPanel value={tabValue} index={0} nopadding={true}>
        <Grid container sx={{pt: 2}} spacing={2}>
          <Grid item sm={4} md={3}>
            <ChannelCard info={tempchannel}/>
          </Grid>
          <Grid item sm={4} md={3}>
            <ChannelCard info={tempchannel}/>
          </Grid>
          <Grid item sm={4} md={3}>
            <ChannelCard info={tempchannel}/>
          </Grid>
          <Grid item sm={4} md={3}>
            <PostTextCard post={tempost} contentObj={tempostcontent}/>
          </Grid>
          <Grid item sm={12} md={6}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <PostImgCard post={tempost} contentObj={tempostcontent}/>
              </Grid>
              <Grid item sm={12} md={6}>
                <ChannelCard info={tempchannel}/>
              </Grid>
              <Grid item sm={12} md={6}>
                <ChannelCard info={tempchannel}/>
              </Grid>
            </Grid>
          </Grid>
          <Grid item sm={12} md={6}>
            <Grid container spacing={2}>
              <Grid item sm={12} md={6}>
                <ChannelCard info={tempchannel}/>
              </Grid>
              <Grid item sm={12} md={6}>
                <ChannelCard info={tempchannel}/>
              </Grid>
              <Grid item xs={12}>
                <PostImgCard post={tempost} contentObj={tempostcontent}/>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
      </TabPanel>
      <TabPanel value={tabValue} index={4}>
      </TabPanel>
    </Container>
  );
}

export default Explore;