<template>
  <view
    class="page profile-page"
    :class="couple.themeClass"
    :style="couple.themeStyle"
  >
    <NavBar :show-back="false">
      <template #left>
        <view class="nav-btn" @click="openPageConfigSheet">
          <!-- <AppIcon name="eye" size="26" color="#fff" /> -->
          <nut-icon name="eye" size="26rpx" custom-color="#fff" style="transform: scaleX(1.4);" />
        </view>
      </template>
      <text class="nav-title" v-if="couple.partnerDisplayName"
        >和{{ couple.partnerDisplayName }}</text
      >
      <template #right>
        <view class="nav-btn" @click="openFontSheet">
          <AppIcon name="font" size="28" color="#fff" />
        </view>
      </template>
    </NavBar>

    <PageLoading :visible="firstLoading" @timeout="firstLoading = false" />

    <scroll-view
      scroll-y
      class="profile-scroll"
      :show-scrollbar="false"
      :refresher-enabled="isMpWeixin"
      :refresher-triggered="isMpWeixin ? refreshing : false"
      @refresherrefresh="onRefresh"
    >
      <!-- 游客模式提示 -->
      <view v-if="couple.isDemo" class="demo-banner">
        <AppIcon name="warning" size="24" color="#E8B86C" />
        <text class="demo-tip">体验模式仅可预览，登录后解锁全部功能</text>
        <view class="demo-switch" @click="switchDemoRole">
          <text>{{ couple.isGirlfriend ? '切换男友端' : '切换女友端' }}</text>
        </view>
      </view>

      <!-- 情侣卡：头像 + 昵称 + 配对信息 -->
      <view class="couple-card">
        <view class="cc-bg-deco" />
        <view class="cc-top">
          <view class="cc-avatar me">
            <view class="avatar-wrap" @click="previewMyAvatar">
              <image
                v-if="couple.me && couple.me.avatar"
                class="avatar"
                :src="couple.me.avatar"
                mode="aspectFill"
              />
              <view v-else class="avatar emoji-avatar">{{
                couple.isGirlfriend ? "🐱" : "👨‍🍳"
              }}</view>
            </view>
            <view class="avatar-edit" @click.stop="chooseAvatar">
              <!-- <AppIcon
                name="camera"
                size="24"
                :color="couple.themeStyle['--c-primary-dark'] || '#E89AA8'"
              /> -->
              <nut-icon
                name="photograph"
                size="24rpx"
                :custom-color="couple.themeStyle['--c-primary']"
              />
            </view>
            <text class="cc-name">{{ couple.myNickname }}</text>
            <text class="cc-tag">{{ couple.myDisplayName }}</text>
          </view>
          <view class="cc-link">
            <view class="cc-heart" @click.stop="burstLove">
              <AppIcon name="heart" size="44" color="#fff" />
              <text class="cc-heart-tip">点一下</text>
            </view>
            <text class="cc-days" v-if="trulyPaired"
              >来到小厨第 {{ pairedDays }} 天</text
            >
            <view
              v-if="!trulyPaired && couple.inviteCode"
              class="cc-code copyable"
              @click.stop="copyInviteCode"
            >
              <text>邀请码：{{ couple.inviteCode }}</text>
              <AppIcon name="copy" size="22" color="#fff" class="copy-icon" />
            </view>
            <text v-else class="cc-code paired"
              >我的 TA · {{ couple.partnerNickname }}</text
            >
          </view>
          <view class="cc-avatar him">
            <view class="avatar-wrap" @click="previewPartnerAvatar">
              <image
                v-if="couple.partner && couple.partner.avatar"
                class="avatar"
                :src="couple.partner.avatar"
                mode="aspectFill"
              />
              <view v-else class="avatar emoji-avatar">{{
                couple.isGirlfriend ? "👨‍🍳" : "🐱"
              }}</view>
            </view>
            <view
              v-if="couple.isGirlfriend"
              class="avatar-edit"
              @click.stop="changePartnerAvatar"
            >
              <!-- <AppIcon
                name="camera"
                size="24"
                :color="couple.themeStyle['--c-primary-dark'] || '#E89AA8'"
              /> -->
              <nut-icon
                name="photograph"
                size="24rpx"
                :custom-color="couple.themeStyle['--c-primary']"
              />
            </view>
            <text class="cc-name">{{ couple.partnerNickname }}</text>
            <text class="cc-tag">{{ couple.partnerDisplayName }}</text>
          </view>
        </view>
      </view>

      <!-- 可折叠内容区 -->
      <view class="profile-collapse-wrap">
        <nut-collapse
          v-model="expandedSections"
          class="profile-collapse"
          @change="onCollapseChange"
        >
          <!-- 女友端：饮食忌口设置 -->
          <nut-collapse-item
            v-if="couple.isGirlfriend && sectionVisible('dietProfile')"
            name="dietProfile"
            :border="false"
            class="sec-item"
          >
            <template #title>
              <view class="sec-head">
                <view class="sec-head-main">
                  <text class="sec-title">我的饮食档案</text>
                  <view
                    class="sec-arrow"
                    :class="{
                      expanded: expandedSections.includes('dietProfile'),
                    }"
                  >
                    <nut-icon
                      name="rect-down"
                      size="28rpx"
                      :custom-color="couple.themeStyle['--c-primary']"
                    />
                  </view>
                  <text class="sec-sub"
                    >{{ couple.partnerDisplayName }}做菜会避开这些哦</text
                  >
                </view>
              </view>
            </template>

            <view class="card pref-card">
              <view class="pref-block">
                <view class="pb-head">
                  <view class="pb-title-wrap">
                    <text class="pb-title">🚫 过敏原</text>
                    <text class="pb-tip">吃了会不舒服的</text>
                  </view>
                  <view
                    class="edit-btn"
                    :class="{ editing: editingPrefs.allergens }"
                    @click="toggleEditPref('allergens')"
                  >
                    <!-- <AppIcon
                  v-if="!editingPrefs.allergens"
                  name="edit"
                  size="18"
                  color="#B8A2C7"
                /> -->
                    <nut-icon
                      v-if="!editingPrefs.allergens"
                      name="edit"
                      size="18rpx"
                      :custom-color="couple.themeStyle['--c-primary']"
                    />
                    <text>{{ editingPrefs.allergens ? "完成" : "编辑" }}</text>
                  </view>
                </view>
                <view class="chip-row">
                  <view
                    v-for="opt in allergenOptions"
                    :key="opt"
                    class="chip"
                    :class="{
                      active: preference.allergens.includes(opt),
                      danger: true,
                      editing: editingPrefs.allergens,
                    }"
                    @click="
                      onChipClick(
                        'allergens',
                        opt,
                        preference.allergens.includes(opt),
                      )
                    "
                  >
                    <text>{{ opt }}</text>
                    <AppIcon
                      v-if="
                        editingPrefs.allergens &&
                        preference.allergens.includes(opt)
                      "
                      name="close"
                      size="18"
                      color="#fff"
                      class="chip-del"
                    />
                  </view>
                  <view
                    v-for="opt in customAllergens"
                    :key="'custom-a-' + opt"
                    class="chip active danger custom-chip"
                    :class="{
                      editing: editingPrefs.allergens,
                      disabled: !editingPrefs.allergens,
                    }"
                    @click="
                      editingPrefs.allergens &&
                      onChipClick('allergens', opt, true)
                    "
                  >
                    <text>{{ opt }}</text>
                    <AppIcon
                      v-if="editingPrefs.allergens"
                      name="close"
                      size="18"
                      color="#fff"
                      class="chip-del"
                    />
                  </view>
                  <view class="chip add-chip" @click="addCustomAllergen">
                    <AppIcon name="add" size="22" color="#B8A2C7" />
                    <text>自定义</text>
                  </view>
                </view>
              </view>

              <view class="pref-block">
                <view class="pb-head">
                  <view class="pb-title-wrap">
                    <text class="pb-title">🙅 不吃食材</text>
                    <text class="pb-tip">挑出来不吃的</text>
                  </view>
                  <view
                    class="edit-btn"
                    :class="{ editing: editingPrefs.dislikes }"
                    @click="toggleEditPref('dislikes')"
                  >
                    <!-- <AppIcon
                      v-if="!editingPrefs.dislikes"
                      name="edit"
                      size="18"
                      color="#B8A2C7"
                    /> -->
                    <nut-icon
                      v-if="!editingPrefs.dislikes"
                      name="edit"
                      size="18rpx"
                      :custom-color="couple.themeStyle['--c-primary']"
                    />
                    <text>{{ editingPrefs.dislikes ? "完成" : "编辑" }}</text>
                  </view>
                </view>
                <view class="chip-row">
                  <view
                    v-for="opt in dislikeOptions"
                    :key="opt"
                    class="chip"
                    :class="{
                      active: preference.dislikes.includes(opt),
                      editing: editingPrefs.dislikes,
                    }"
                    @click="
                      onChipClick(
                        'dislikes',
                        opt,
                        preference.dislikes.includes(opt),
                      )
                    "
                  >
                    <text>{{ opt }}</text>
                    <AppIcon
                      v-if="
                        editingPrefs.dislikes &&
                        preference.dislikes.includes(opt)
                      "
                      name="close"
                      size="18"
                      color="#fff"
                      class="chip-del"
                    />
                  </view>
                  <view
                    v-for="opt in customDislikes"
                    :key="'custom-d-' + opt"
                    class="chip active custom-chip"
                    :class="{
                      editing: editingPrefs.dislikes,
                      disabled: !editingPrefs.dislikes,
                    }"
                    @click="
                      editingPrefs.dislikes &&
                      onChipClick('dislikes', opt, true)
                    "
                  >
                    <text>{{ opt }}</text>
                    <AppIcon
                      v-if="editingPrefs.dislikes"
                      name="close"
                      size="18"
                      color="#fff"
                      class="chip-del"
                    />
                  </view>
                  <view class="chip add-chip" @click="addCustomDislike">
                    <AppIcon name="add" size="22" color="#B8A2C7" />
                    <text>自定义</text>
                  </view>
                </view>
              </view>

              <view class="pref-block">
                <view class="pb-head">
                  <view class="pb-title-wrap">
                    <text class="pb-title">😋 口味偏好</text>
                    <text class="pb-tip">喜欢什么口味</text>
                  </view>
                  <view
                    class="edit-btn"
                    :class="{ editing: editingPrefs.tastePrefs }"
                    @click="toggleEditPref('tastePrefs')"
                  >
                    <!-- <AppIcon
                      v-if="!editingPrefs.tastePrefs"
                      name="edit"
                      size="18"
                      color="#B8A2C7"
                    /> -->
                    <nut-icon
                      v-if="!editingPrefs.tastePrefs"
                      name="edit"
                      size="18rpx"
                      :custom-color="couple.themeStyle['--c-primary']"
                    />
                    <text>{{ editingPrefs.tastePrefs ? "完成" : "编辑" }}</text>
                  </view>
                </view>
                <view class="chip-row">
                  <view
                    v-for="opt in tasteOptions"
                    :key="opt"
                    class="chip"
                    :class="{
                      active: preference.tastePrefs.includes(opt),
                      editing: editingPrefs.tastePrefs,
                    }"
                    @click="
                      onChipClick(
                        'tastePrefs',
                        opt,
                        preference.tastePrefs.includes(opt),
                      )
                    "
                  >
                    <text>{{ opt }}</text>
                    <AppIcon
                      v-if="
                        editingPrefs.tastePrefs &&
                        preference.tastePrefs.includes(opt)
                      "
                      name="close"
                      size="18"
                      color="#fff"
                      class="chip-del"
                    />
                  </view>
                  <view
                    v-for="opt in customTastePrefs"
                    :key="'custom-t-' + opt"
                    class="chip active taro custom-chip"
                    :class="{
                      editing: editingPrefs.tastePrefs,
                      disabled: !editingPrefs.tastePrefs,
                    }"
                    @click="
                      editingPrefs.tastePrefs &&
                      onChipClick('tastePrefs', opt, true)
                    "
                  >
                    <text>{{ opt }}</text>
                    <AppIcon
                      v-if="editingPrefs.tastePrefs"
                      name="close"
                      size="18"
                      color="#fff"
                      class="chip-del"
                    />
                  </view>
                  <view class="chip add-chip" @click="addCustomTastePref">
                    <AppIcon name="add" size="22" color="#B8A2C7" />
                    <text>自定义</text>
                  </view>
                </view>
              </view>
            </view>
          </nut-collapse-item>

          <!-- 男友端：伴侣饮食档案（只读，接单时高亮提醒） -->
          <nut-collapse-item
            v-else-if="sectionVisible('dietProfile')"
            name="dietProfile"
            :border="false"
            class="sec-item"
          >
            <template #title>
              <view class="sec-head">
                <view class="sec-head-main">
                  <text class="sec-title"
                    >{{ couple.partnerDisplayName }}的饮食档案</text
                  >
                  <view
                    class="sec-arrow"
                    :class="{
                      expanded: expandedSections.includes('dietProfile'),
                    }"
                  >
                    <nut-icon
                      name="rect-down"
                      size="28rpx"
                      :custom-color="couple.themeStyle['--c-primary']"
                    />
                  </view>
                  <text class="sec-sub">做菜前先看这个，避免踩雷</text>
                </view>
              </view>
            </template>
            <view class="card pref-card">
              <view
                v-if="preference.allergens.length > 0"
                class="pref-block readonly"
              >
                <view class="pb-head">
                  <text class="pb-title danger"
                    >🚫 {{ couple.partnerDisplayName }}的过敏原</text
                  >
                  <text class="pb-tip danger">千万别放这些</text>
                </view>
                <view class="chip-row">
                  <view
                    v-for="a in preference.allergens"
                    :key="a"
                    class="chip active danger"
                  >
                    <text>{{ a }}</text>
                  </view>
                </view>
              </view>
              <view v-else class="pref-block readonly">
                <view class="pb-head">
                  <text class="pb-title">🚫 过敏原</text>
                  <text class="pb-tip"
                    >{{ couple.partnerDisplayName }}没设置过敏原</text
                  >
                </view>
              </view>

              <view
                v-if="preference.dislikes.length > 0"
                class="pref-block readonly"
              >
                <view class="pb-head">
                  <text class="pb-title"
                    >🙅 {{ couple.partnerDisplayName }}不吃这些</text
                  >
                  <text class="pb-tip">能挑就挑出来</text>
                </view>
                <view class="chip-row">
                  <view
                    v-for="d in preference.dislikes"
                    :key="d"
                    class="chip active"
                  >
                    <text>{{ d }}</text>
                  </view>
                </view>
              </view>

              <view
                v-if="preference.tastePrefs.length > 0"
                class="pref-block readonly"
              >
                <view class="pb-head">
                  <text class="pb-title"
                    >😋 {{ couple.partnerDisplayName }}的口味</text
                  >
                  <text class="pb-tip">照着这个做准没错</text>
                </view>
                <view class="chip-row">
                  <view
                    v-for="t in preference.tastePrefs"
                    :key="t"
                    class="chip active taro"
                  >
                    <text>{{ t }}</text>
                  </view>
                </view>
              </view>
            </view>
          </nut-collapse-item>

          <!-- 女友端：想吃收藏清单 -->
          <nut-collapse-item
            v-if="couple.isGirlfriend && sectionVisible('favorites')"
            name="favorites"
            :border="false"
            class="sec-item"
          >
            <template #title>
              <view class="sec-head">
                <view class="sec-head-main">
                  <text class="sec-title">我的想吃清单</text>
                  <view
                    class="sec-arrow"
                    :class="{
                      expanded: expandedSections.includes('favorites'),
                    }"
                  >
                    <nut-icon
                      name="rect-down"
                      size="28rpx"
                      :custom-color="couple.themeStyle['--c-primary']"
                    />
                  </view>
                  <text
                    class="sec-sub"
                    v-if="
                      preference.favorites.length > 0 &&
                      favoriteDishes.length <= 2
                    "
                    >{{ preference.favorites.length }} 道想吃的</text
                  >
                </view>
                <view class="sec-head-right" v-if="favoriteDishes.length > 2">
                  <view class="sec-more" @click.stop="goFavorites">
                    <text>查看全部</text>
                    <nut-icon
                      name="rect-right"
                      size="22rpx"
                      :custom-color="couple.themeStyle['--c-primary']"
                    />
                  </view>
                </view>
              </view>
            </template>
            <view v-if="favoriteDishes.length === 0" class="card empty-card">
              <AppIcon
                name="heartOutline"
                size="72"
                :color="couple.themeStyle['--c-primary'] || '#F5B6C1'"
                class="ec-icon"
              />
              <text class="ec-text">还没收藏想吃的菜</text>
              <view class="ec-sub">
                <text>点菜时点</text>
                <AppIcon
                  name="heartOutline"
                  size="22"
                  :color="couple.themeStyle['--c-primary'] || '#F5B6C1'"
                />
                <text>就能收藏啦</text>
              </view>
            </view>
            <view v-else class="card fav-grid">
              <view
                v-for="d in recentFavDishes"
                :key="d.id"
                class="fav-card"
                @click="goDishDetail(d.id)"
              >
                <DishEmoji
                  :image="d.image"
                  :emoji="d.emoji"
                  :bg="d.bgColor"
                  size="lg"
                />
                <view class="fav-info">
                  <text class="fav-name ellipsis">{{ d.name }}</text>
                  <text class="fav-cat">{{ categoryName(d.categoryId) }}</text>
                </view>
                <view
                  class="fav-fav active"
                  @click.stop="onToggleFavorite(d.id)"
                >
                  <AppIcon name="heart" size="28" color="#E08B8B" />
                </view>
              </view>
            </view>
          </nut-collapse-item>

          <!-- 女友端：我的菜品库 -->
          <nut-collapse-item
            v-if="couple.isGirlfriend && sectionVisible('dishLibrary')"
            name="dishLibrary"
            :border="false"
            class="sec-item"
          >
            <template #title>
              <view class="sec-head">
                <view class="sec-head-main">
                  <text class="sec-title">我的菜品库</text>
                  <view
                    class="sec-arrow"
                    :class="{
                      expanded: expandedSections.includes('dishLibrary'),
                    }"
                  >
                    <nut-icon
                      name="rect-down"
                      size="28rpx"
                      :custom-color="couple.themeStyle['--c-primary']"
                    />
                  </view>
                </view>
                <view
                  class="sec-head-right"
                  v-if="dishStore.customDishes.length"
                >
                  <view class="sec-more" @click.stop="goLibrary">
                    <text>查看全部</text>
                    <nut-icon
                      name="rect-right"
                      size="22rpx"
                      :custom-color="couple.themeStyle['--c-primary']"
                    />
                  </view>
                </view>
              </view>
            </template>
            <view
              v-if="dishStore.customDishes.length === 0"
              class="card empty-card"
            >
              <AppIcon
                name="menu"
                size="72"
                :color="couple.themeStyle['--c-taro'] || '#B8A2C7'"
                class="ec-icon"
              />
              <text class="ec-text">还没有上传菜品</text>
              <text class="ec-sub">去菜单页点「＋上传」添加想吃的菜</text>
            </view>
            <view v-else class="card memory-list">
              <view
                v-for="d in recentDishes"
                :key="d.id"
                class="memory-card"
                @click="goDishDetail(d.id)"
              >
                <view class="mc-top">
                  <view class="mc-dish-img-wrap">
                    <DishEmoji
                      :image="d.image"
                      :emoji="d.emoji"
                      :bg="d.bgColor"
                      size="sm"
                    />
                  </view>
                  <view class="mc-info">
                    <text class="mc-date">{{ d.name }}</text>
                    <text class="mc-items ellipsis">{{
                      d.desc || "暂无描述"
                    }}</text>
                  </view>
                </view>
              </view>
            </view>
          </nut-collapse-item>

          <!-- 回忆相册：已完成订单 + 评分 -->
          <nut-collapse-item
            v-if="sectionVisible('memory')"
            name="memory"
            :border="false"
            class="sec-item"
          >
            <template #title>
              <view class="sec-head">
                <view class="sec-head-main">
                  <text class="sec-title">回忆相册</text>
                  <view
                    class="sec-arrow"
                    :class="{ expanded: expandedSections.includes('memory') }"
                  >
                    <nut-icon
                      name="rect-down"
                      size="28rpx"
                      :custom-color="couple.themeStyle['--c-primary']"
                    />
                  </view>
                </view>
                <view class="sec-head-right" v-if="memoryOrders.length">
                  <view class="sec-more" @click.stop="goMemory">
                    <text>查看全部</text>
                    <nut-icon
                      name="rect-right"
                      size="22rpx"
                      :custom-color="couple.themeStyle['--c-primary']"
                    />
                  </view>
                </view>
              </view>
            </template>
            <view v-if="memoryOrders.length === 0" class="card empty-card">
              <!-- <AppIcon
                name="camera"
                size="72"
                :color="couple.themeStyle['--c-taro'] || '#B8A2C7'"
                class="ec-icon"
              /> -->
              <nut-icon name="photograph" size="50rpx" :custom-color="couple.themeStyle['--c-taro'] || '#B8A2C7'" />
              <text class="ec-text">还没有回忆记录</text>
              <text class="ec-sub">完成订单后就能存进相册啦</text>
            </view>
            <view v-else class="card memory-list">
              <view
                v-for="o in recentMemories"
                :key="o.id"
                class="memory-card"
                @click="goDetail(o.id)"
              >
                <view class="mc-top">
                  <view class="mc-thumbs">
                    <DishEmoji
                      v-for="(it, i) in o.items.slice(0, 3)"
                      :key="it.itemId || it.lineKey || it.id"
                      class="mc-thumb"
                      :style="{ marginLeft: i === 0 ? '0' : '-16rpx' }"
                      :image="it.image"
                      :emoji="it.emoji"
                      :bg="it.bgColor"
                      size="sm"
                    />
                  </view>
                  <view class="mc-info">
                    <text class="mc-date">{{ formatTime(o.createdAt) }}</text>
                    <text class="mc-items ellipsis">{{
                      o.items.map((i) => i.name).join("、")
                    }}</text>
                  </view>
                </view>
                <view v-if="o.rating > 0" class="mc-rate">
                  <view class="mc-stars">
                    <AppIcon
                      v-for="i in 5"
                      :key="i"
                      class="mc-star"
                      :class="{ active: i <= o.rating }"
                      :name="i <= o.rating ? 'star' : 'starOutline'"
                      size="28"
                    />
                  </view>
                  <text v-if="o.ratingComment" class="mc-comment ellipsis">{{
                    o.ratingComment
                  }}</text>
                  <text v-else class="mc-comment"
                    >{{
                      couple.isGirlfriend
                        ? couple.myDisplayName + "给了"
                        : couple.partnerDisplayName + "给了"
                    }}
                    {{ o.rating }} 颗星</text
                  >
                </view>
                <view v-else class="mc-rate">
                  <text class="mc-norate">还没打分</text>
                </view>
              </view>
            </view>
          </nut-collapse-item>
        </nut-collapse>
      </view>

      <!-- 历史订单入口 -->
      <view v-if="sectionVisible('orders')" class="section">
        <view class="entry-card" @click="goOrders">
          <view class="ec-left">
            <AppIcon
              name="order"
              size="44"
              :color="couple.themeStyle['--c-taro'] || '#B8A2C7'"
              class="ec-icon"
            />
            <view class="ec-body">
              <text class="ec-title">全部订单</text>
              <text class="ec-sub"
                >{{ orderStore.orders.length }} 个订单 ·
                {{
                  couple.isGirlfriend
                    ? "看看" + couple.partnerDisplayName + "给你做过什么"
                    : "看看给" + couple.partnerDisplayName + "做过什么"
                }}</text
              >
            </view>
          </view>
          <nut-icon
            name="rect-right"
            size="30rpx"
            :custom-color="couple.themeStyle['--c-primary']"
          />
        </view>
      </view>

      <!-- 心愿单入口（女友端许愿 / 男友端查看） -->
      <view v-if="sectionVisible('wishlist')" class="section">
        <view class="entry-card wish-card" @click="goWishlist">
          <view class="ec-left">
            <AppIcon
              name="gift"
              size="40"
              :color="couple.themeStyle['--c-primary'] || '#F5B6C1'"
            />
            <view class="ec-body">
              <text class="ec-title">{{
                couple.isGirlfriend
                  ? "我的心愿单"
                  : couple.partnerDisplayName + "的心愿单"
              }}</text>
              <text class="ec-sub">{{
                couple.isGirlfriend
                  ? "许下心愿等" + couple.partnerDisplayName + "来实现"
                  : "看看 TA 想要什么，帮 TA 实现"
              }}</text>
            </view>
          </view>
          <nut-icon
            name="rect-right"
            size="30rpx"
            :custom-color="couple.themeStyle['--c-primary']"
          />
        </view>
      </view>

      <!-- 暖心彩蛋 -->
      <view v-if="sectionVisible('fun')" class="section">
        <view class="entry-card fun-card" @click="goFun">
          <view class="ec-left">
            <AppIcon
              name="sparkles"
              size="40"
              :color="couple.themeStyle['--c-primary'] || '#F5B6C1'"
            />
            <view class="ec-body">
              <text class="ec-title">{{
                couple.isGirlfriend
                  ? couple.myDisplayName + "的专属彩蛋"
                  : "给" + couple.partnerDisplayName + "的暖心彩蛋"
              }}</text>
              <text class="ec-sub">点一点，有惊喜哦</text>
            </view>
          </view>
          <nut-icon
            name="rect-right"
            size="30rpx"
            :custom-color="couple.themeStyle['--c-primary']"
          />
        </view>
      </view>

      <!-- 设置 -->
      <view v-if="sectionVisible('settings')" class="section">
        <view class="entry-card" @click="onSettings">
          <view class="ec-left">
            <AppIcon
              name="settings"
              size="40"
              :color="couple.themeStyle['--c-taro'] || '#B8A2C7'"
            />
            <view class="ec-body">
              <text class="ec-title">设置</text>
              <text class="ec-sub">昵称头像、主题色、字体、服务器、解绑</text>
            </view>
          </view>
          <nut-icon
            name="rect-right"
            size="30rpx"
            :custom-color="couple.themeStyle['--c-primary']"
          />
        </view>
      </view>

      <view class="foot-tip" v-if="couple.isGirlfriend"
        >— 饿了就告诉{{ couple.partnerDisplayName }}，{{
          couple.partnerDisplayName
        }}都在 —</view
      >
      <view class="foot-tip" v-else
        >— 想{{ couple.partnerDisplayName }}了就告诉她，{{
          couple.partnerDisplayName
        }}一直都在 —</view
      >
      <view class="tab-holder" />
    </scroll-view>

    <LoveParticles
      ref="loveRef"
      :x="lovePos.x"
      :y="lovePos.y"
      :mode="loveMode"
    />

    <TabBar current="profile" />

    <!-- 设置弹层（替代 showActionSheet，小程序最多 6 项） -->
    <view
      v-show="settingsSheet"
      class="sheet-mask"
      :class="{ show: settingsSheet }"
      @click="settingsSheet = false"
      @touchmove.stop.prevent
    >
      <view class="sheet-popup" @click.stop @touchmove.stop.prevent>
        <view class="sp-head">
          <text class="sp-title">设置</text>
          <view class="sp-close" @click="settingsSheet = false">
            <AppIcon name="close" size="24" color="#999" />
          </view>
        </view>
        <scroll-view scroll-y class="sp-list" :show-scrollbar="false">
          <view
            class="sp-item"
            @click="
              settingsSheet = false;
              resetNames();
            "
            ><text>↩️ 恢复默认称呼</text></view
          >
          <view
            class="sp-item"
            @click="
              settingsSheet = false;
              openThemeSheet();
            "
            ><text>🎨 主题色</text></view
          >
          <view
            class="sp-item"
            @click="
              settingsSheet = false;
              openFontSheet();
            "
            ><text>🅰️ 字体风格</text></view
          >
          <view
            class="sp-item"
            @click="
              settingsSheet = false;
              onLogout();
            "
            ><text>🚪 退出登录</text>
          </view>
          <view
            class="sp-item disabled"
            @click="
              settingsSheet = false;
              onUnbindDisabled();
            "
            ><text>🔓 解绑伴侣</text></view
          >
          <view class="sp-item" @click="goAllSettings()">
            <text>⚙️ 全部设置</text>
          </view>
          <view
            class="sp-item"
            @click="
              settingsSheet = false;
              goLottery();
            "
          >
            <text>🎮 抢先体验</text>
          </view>
          <view
            class="sp-item"
            @click="
              settingsSheet = false;
              openAboutSheet();
            "
          >
            <text>ℹ️ 关于我们</text>
            <text class="sp-version">v{{ appVersion }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 主题色弹层 -->
    <view
      v-show="themeSheet"
      class="sheet-mask"
      :class="{ show: themeSheet }"
      @click="themeSheet = false"
      @touchmove.stop.prevent
    >
      <view class="sheet-popup" @click.stop @touchmove.stop.prevent>
        <view class="sp-head">
          <text class="sp-title">选择主题色</text>
          <view class="sp-close" @click="themeSheet = false">
            <AppIcon name="close" size="24" color="#999" />
          </view>
        </view>
        <scroll-view scroll-y class="sp-list" :show-scrollbar="false">
          <view
            v-for="(k, i) in THEME_PRESETS"
            :key="i"
            class="sp-item"
            @click="onThemePick(k)"
          >
            <text
              >{{ THEME_ICONS[k] }} {{ THEME_LABELS[k]
              }}{{ k === couple.currentThemeKey ? " ✓" : "" }}</text
            >
          </view>
          <view class="sp-item" @click="onThemePick('')"
            ><text>🎨 恢复默认</text></view
          >
        </scroll-view>
      </view>
    </view>

    <!-- 字体弹层 -->
    <view
      v-show="fontSheet"
      class="sheet-mask"
      :class="{ show: fontSheet }"
      @click="fontSheet = false"
      @touchmove.stop.prevent
    >
      <view class="sheet-popup" @click.stop @touchmove.stop.prevent>
        <view class="sp-head">
          <text class="sp-title">选择字体风格</text>
          <view class="sp-close" @click="fontSheet = false">
            <AppIcon name="close" size="24" color="#999" />
          </view>
        </view>
        <scroll-view scroll-y class="sp-list" :show-scrollbar="false">
          <view
            v-for="k in FONT_PRESETS"
            :key="k"
            class="sp-item"
            :style="{ fontFamily: getFontFamily(k) }"
            @click="onFontPick(k)"
          >
            <text
              >{{ FONT_ICONS[k] }} {{ FONT_LABELS[k]
              }}{{ k === couple.currentFontKey ? " ✓" : "" }}</text
            >
          </view>
          <view
            class="sp-item"
            :style="{ fontFamily: getFontFamily('system') }"
            @click="onFontPick('')"
            ><text>📱 恢复默认</text></view
          >
        </scroll-view>
      </view>
    </view>

    <!-- 版本信息弹窗 -->
    <view
      v-show="aboutSheet"
      class="sheet-mask"
      :class="{ show: aboutSheet }"
      @click="closeAboutSheet"
      @touchmove.stop.prevent
    >
      <view class="sheet-popup about-popup" @click.stop @touchmove.stop.prevent>
        <view class="sp-head">
          <text class="sp-title">关于我们</text>
          <view class="sp-close" @click="closeAboutSheet">
            <AppIcon name="close" size="24" color="#999" />
          </view>
        </view>
        <view class="about-body">
          <view class="about-logo">
            <AppIcon
              name="heart"
              size="80"
              :color="couple.themeStyle['--c-primary'] || '#F5B6C1'"
            />
          </view>
          <text class="about-name">给她的小厨房</text>
          <text class="about-version">版本 {{ appVersion }}</text>
          <text class="about-desc">专属二人的情侣干饭点餐小工具</text>
          <text class="about-slogan">❤ 用心做好每一餐</text>
        </view>
        <view class="about-foot">
          <view class="about-btn" @click="closeAboutSheet">知道啦</view>
        </view>
      </view>
    </view>

    <!-- 服务器地址编辑弹窗 -->
    <view
      v-show="serverSheet"
      class="sheet-mask"
      :class="{ show: serverSheet }"
      @click="serverSheet = false"
      @touchmove.stop.prevent
    >
      <view
        class="sheet-popup server-popup"
        @click.stop
        @touchmove.stop.prevent
      >
        <view class="sp-head">
          <text class="sp-title">服务器地址</text>
          <view class="sp-close" @click="serverSheet = false">
            <AppIcon name="close" size="24" color="#999" />
          </view>
        </view>
        <view class="server-body">
          <text class="server-tip">切换后端服务地址，保存后重新登录生效</text>
          <input
            :value="serverUrlInput"
            class="server-input"
            placeholder="如 http://192.168.1.5:5000"
            placeholder-class="ipt-ph"
            maxlength="200"
            @input="(e) => (serverUrlInput = e.detail.value)"
          />
        </view>
        <view class="server-foot">
          <view class="server-btn ghost" @click="serverSheet = false"
            >取消</view
          >
          <view class="server-btn primary" @click="confirmServerUrl">保存</view>
        </view>
      </view>
    </view>

    <!-- 页面模块显示配置弹窗 -->
    <view
      v-show="pageConfigSheet"
      class="sheet-mask"
      :class="{ show: pageConfigSheet }"
      @click="pageConfigSheet = false"
      @touchmove.stop.prevent
    >
      <view class="sheet-popup" @click.stop @touchmove.stop.prevent>
        <view class="sp-head">
          <text class="sp-title">页面显示配置</text>
          <view class="sp-close" @click="pageConfigSheet = false">
            <AppIcon name="close" size="24" color="#999" />
          </view>
        </view>
        <view class="pc-body">
          <text class="pc-tip">勾选要显示的模块，取消则隐藏</text>
          <view class="pc-list">
            <view
              v-for="s in pageSections"
              :key="s.key"
              class="pc-item"
              :class="{ active: pageConfigDraft[s.key] !== false }"
              @click="toggleSection(s.key)"
            >
              <AppIcon
                class="pc-icon"
                :name="s.icon"
                size="36"
                :color="couple.themeStyle['--c-taro'] || '#B8A2C7'"
              />
              <text class="pc-label">{{ s.label }}</text>
              <view
                class="pc-switch"
                :class="{ on: pageConfigDraft[s.key] !== false }"
              >
                <view class="ps-dot" />
              </view>
            </view>
          </view>
        </view>
        <view class="pc-foot">
          <view class="pc-btn ghost" @click="resetPageConfig">恢复默认</view>
          <view class="pc-btn primary" @click="savePageConfig">保存</view>
        </view>
      </view>
    </view>

    <Toast />
  </view>
</template>

<script setup>
/**
 * 个人中心页（女友端 + 男友端共用）
 * -----------------------------------------------------------------------------
 * 女友端：
 * 1) 饮食档案设置：过敏原 / 不吃食材 / 口味偏好（永久保存，男友端读这个）
 * 2) 想吃收藏清单
 * 3) 回忆相册：已完成订单 + 评分评价
 * 4) 全部订单入口
 *
 * 男友端：
 * 1) 伴侣饮食档案（只读）：接单前看这个避免踩雷
 * 2) 回忆相册
 * 3) 全部订单入口
 */
import { computed, ref, watch } from "vue";
import { onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import NavBar from "@/components/NavBar.vue";
import TabBar from "@/components/TabBar.vue";
import DishEmoji from "@/components/DishEmoji.vue";
import AppIcon from "@/components/AppIcon.vue";
import LoveParticles from "@/components/LoveParticles.vue";
import Toast from "@/components/Toast.vue";
import PageLoading from "@/components/PageLoading.vue";
import { useCoupleStore } from "@/store/couple";
import {
  usePreferenceStore,
  ALLERGEN_OPTIONS,
  DISLIKE_OPTIONS,
  TASTE_OPTIONS,
} from "@/store/preference";
import { useOrderStore } from "@/store/order";
import { useDishStore } from "@/store/dish";
import { useAddressStore } from "@/store/address";
import { formatTime } from "@/utils/format";
import { api } from "@/utils/api";
import { resolveUrl } from "@/utils/server";
import { toast } from "@/utils/toast";
import { copyText } from "@/utils/clipboard";
import { requireLogin } from "@/utils/auth";
import { usePoll } from "@/utils/sync";
import { useSettings } from "@/composables/useSettings";

// 个人中心页需要情侣资料同步（头像/昵称/主题/字体等）
usePoll(["couple", "dishes"]);

const couple = useCoupleStore();
const preference = usePreferenceStore();

function switchDemoRole() {
  const newRole = couple.isGirlfriend ? 'boyfriend' : 'girlfriend';
  couple.useDemo(newRole);
  uni.showToast({ title: newRole === 'boyfriend' ? '已切换到男友端体验' : '已切换到女友端体验', icon: 'none' });
  // setTimeout(() => {
  //   uni.reLaunch({ url: '/pages/index/index' });
  // }, 800);
}
const {
  settingsSheet,
  themeSheet,
  fontSheet,
  aboutSheet,
  serverSheet,
  pageConfigSheet,
  pageConfigDraft,
  pageSections,
  serverUrlInput,
  appVersion,
  openThemeSheet,
  openFontSheet,
  closeAboutSheet,
  onThemePick,
  onFontPick,
  chooseAvatar,
  resetNames,
  onLogout,
  onUnbindDisabled,
  editServerUrl,
  openAboutSheet,
  confirmServerUrl,
  goLottery,
  goAllSettings,
  openPageConfigSheet,
  toggleSection,
  savePageConfig,
  resetPageConfig,
  THEME_PRESETS,
  THEME_LABELS,
  THEME_ICONS,
  FONT_PRESETS,
  FONT_LABELS,
  FONT_ICONS,
  getFontFamily,
} = useSettings();
const orderStore = useOrderStore();
const dishStore = useDishStore();
const addressStore = useAddressStore();

// 平台判断：scroll-view 原生下拉刷新仅在小程序启用
const isMpWeixin = ref(false);
// #ifdef MP-WEIXIN
isMpWeixin.value = true;
// #endif

// 手动触发暖心粒子特效
const loveRef = ref(null);
const lovePos = ref({ x: 0, y: 0 });
const loveMode = ref("heart");
const refreshing = ref(false);

// 页面首次加载
const firstLoading = ref(true);

// 可折叠内容区：默认全部展开，用户配置会覆盖默认行为
const ALL_EXPANDED_GF = ["dietProfile", "favorites", "dishLibrary", "memory"];
const ALL_EXPANDED_BF = ["dietProfile", "memory"];

const defaultExpanded = computed(() =>
  couple.isBoyfriend ? [...ALL_EXPANDED_BF] : [...ALL_EXPANDED_GF],
);

// 本地 ref 保存当前展开/收起状态（v-model 双向绑定需要）
const _expandedSections = ref([]);

// 标记用户是否手动操作过折叠面板
let manualCollapseChanged = false;

function applyExpandConfig() {
  // 如果用户已手动操作过，不再应用配置
  if (manualCollapseChanged) return;
  const cfg = couple.expandConfigParsed;
  if (!cfg) {
    _expandedSections.value = [...defaultExpanded.value];
  } else {
    _expandedSections.value = cfg.sections || [];
  }
}

applyExpandConfig();

// 当配置从后端/设置页同步过来时，重新应用（用户手动操作后不再应用）
watch(
  () => couple.expandConfigParsed,
  () => {
    if (!manualCollapseChanged) {
      applyExpandConfig();
    }
  },
);

const expandedSections = computed({
  get() {
    return _expandedSections.value;
  },
  set(val) {
    // 标记为手动操作，后续配置同步将不再覆盖
    manualCollapseChanged = true;
    _expandedSections.value = val;
  },
});

// nut-collapse change 事件处理
function onCollapseChange(val) {
  manualCollapseChanged = true;
  _expandedSections.value = val;
}

// 饮食档案编辑状态
const editingPrefs = ref({
  allergens: false,
  dislikes: false,
  tastePrefs: false,
});

const dishes = computed(() => dishStore.dishes);
const categories = computed(() => dishStore.categories);

const allergenOptions = ALLERGEN_OPTIONS;
const dislikeOptions = DISLIKE_OPTIONS;
const tasteOptions = TASTE_OPTIONS;

// 以多个字段兜底判断真实配对状态，避免本地状态滞后导致仍显示邀请码
const trulyPaired = computed(
  () =>
    couple.isBound ||
    !!couple.partner?.id ||
    couple.isPaired,
);

// 配对天数
const pairedDays = computed(() => {
  if (!couple.boundAt) return 1;
  const days = Math.floor((Date.now() - couple.boundAt) / (24 * 3600 * 1000));
  return Math.max(1, days);
});

// 想吃收藏的菜品列表
const favoriteDishes = computed(() =>
  preference.favorites
    .map((id) => dishes.value.find((d) => d.id === id))
    .filter(Boolean),
);
const recentFavDishes = computed(() => favoriteDishes.value.slice(0, 2));

// 回忆相册：已完成的订单
const memoryOrders = computed(() => orderStore.memoryOrders);
const recentMemories = computed(() => memoryOrders.value.slice(0, 2));
const recentDishes = computed(() => dishStore.customDishes.slice(0, 2));

// 页面模块显示配置：空配置默认全部显示
const pageCfg = computed(() => couple.pageConfigParsed);
function sectionVisible(key) {
  const cfg = pageCfg.value;
  if (!cfg || Object.keys(cfg).length === 0) return true;
  return cfg[key] !== false;
}

// 自定义项（不在预设列表里的已选项）
const customAllergens = computed(() =>
  preference.allergens.filter((a) => !allergenOptions.includes(a)),
);
const customDislikes = computed(() =>
  preference.dislikes.filter((d) => !dislikeOptions.includes(d)),
);
const customTastePrefs = computed(() =>
  preference.tastePrefs.filter((t) => !tasteOptions.includes(t)),
);

function categoryName(catId) {
  const c = categories.value.find((x) => x.id === catId);
  return c ? c.name : "";
}

function goMenu() {
  uni.reLaunch({ url: "/pages/menu/menu" });
}
function burstLove(e) {
  // 女友端发射爱心，男友端发射星星，统一风格
  loveMode.value = couple.isGirlfriend ? "heart" : "star";
  lovePos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  loveRef.value?.burst();
}
function goOrders() {
  uni.reLaunch({ url: "/pages/orders/orders" });
}
function goFun() {
  uni.navigateTo({ url: "/pages/fun/fun" });
}
function goWishlist() {
  uni.navigateTo({ url: "/pages/wishlist/wishlist" });
}
function goMemory() {
  uni.navigateTo({ url: "/pages/memory/memory" });
}
function goLibrary() {
  uni.navigateTo({ url: "/pages/library/library" });
}
function goFavorites() {
  uni.navigateTo({ url: "/pages/favorites/favorites" });
}
function goDishDetail(id) {
  uni.navigateTo({ url: "/pages/dish/detail?id=" + id });
}
function goDetail(id) {
  uni.navigateTo({ url: "/pages/orders/detail?id=" + id });
}
function onToggleFavorite(dishId) {
  if (!requireLogin(couple)) return;
  if (preference.isFavorite(dishId)) {
    uni.showModal({
      title: "取消收藏",
      content: "确定不再想吃这道菜了吗？",
      confirmColor: couple.themeStyle["--c-primary"] || "#F5B6C1",
      success: (res) => {
        if (res.confirm) {
          preference.toggleFavorite(dishId);
        }
      },
    });
  } else {
    preference.toggleFavorite(dishId);
  }
}
function addCustomAllergen() {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: "添加过敏原",
    editable: true,
    placeholderText: "输入过敏原名称",
    success: (res) => {
      if (res.confirm && res.content) {
        preference.addAllergen(res.content);
      }
    },
  });
}
function addCustomDislike() {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: "添加不吃食材",
    editable: true,
    placeholderText: "输入食材名称",
    success: (res) => {
      if (res.confirm && res.content) {
        preference.addDislike(res.content);
      }
    },
  });
}
function addCustomTastePref() {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: "添加口味偏好",
    editable: true,
    placeholderText: "输入口味名称",
    success: (res) => {
      if (res.confirm && res.content) {
        preference.addTastePref(res.content);
      }
    },
  });
}
function removeCustomAllergen(v) {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: "移除",
    content: `确定移除「${v}」吗？`,
    success: (res) => {
      if (res.confirm) preference.removeAllergen(v);
    },
  });
}
function removeCustomDislike(v) {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: "移除",
    content: `确定移除「${v}」吗？`,
    success: (res) => {
      if (res.confirm) preference.removeDislike(v);
    },
  });
}
function removeCustomTastePref(v) {
  if (!requireLogin(couple)) return;
  uni.showModal({
    title: "移除",
    content: `确定移除「${v}」吗？`,
    success: (res) => {
      if (res.confirm) preference.removeTastePref(v);
    },
  });
}
function toggleEditPref(key) {
  editingPrefs.value[key] = !editingPrefs.value[key];
}
function isCustomOption(key, opt) {
  if (key === "allergens") return !allergenOptions.includes(opt);
  if (key === "dislikes") return !dislikeOptions.includes(opt);
  if (key === "tastePrefs") return !tasteOptions.includes(opt);
  return false;
}
function onChipClick(key, opt, active) {
  if (!requireLogin(couple)) return;
  if (editingPrefs.value[key]) {
    if (active) {
      if (key === "allergens") preference.removeAllergen(opt);
      else if (key === "dislikes") preference.removeDislike(opt);
      else if (key === "tastePrefs") preference.removeTastePref(opt);
    } else {
      if (key === "allergens") preference.addAllergen(opt);
      else if (key === "dislikes") preference.addDislike(opt);
      else if (key === "tastePrefs") preference.addTastePref(opt);
    }
    return;
  }
  // 非编辑模式：统一 toggle，不触发删除
  if (key === "allergens") preference.toggleAllergen(opt);
  else if (key === "dislikes") preference.toggleDislike(opt);
  else if (key === "tastePrefs") preference.toggleTastePref(opt);
}
function copyInviteCode() {
  if (!couple.inviteCode) return;
  copyText(couple.inviteCode, "邀请码已复制");
}
async function changePartnerAvatar() {
  if (!requireLogin(couple)) return;
  if (!couple.partner || !couple.partner.id) {
    toast.info("伴侣未登录，暂时无法更换");
    return;
  }
  try {
    const res = await uni.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
    });
    const filePath = res.tempFilePaths && res.tempFilePaths[0];
    if (!filePath) return;
    toast.loading("上传中…");
    const data = await api.uploadImage(filePath);
    toast.hide();
    // 更新伴侣头像并同步双方资料
    await couple.updatePartnerAvatar(data.url);
    await couple.fetchFromServer(true).catch(() => {});
    toast.success("头像已更新");
  } catch (e) {
    toast.hide();
    console.error("[changePartnerAvatar]", e);
    toast.error("上传失败");
  }
}
function onSettings() {
  settingsSheet.value = true;
}

function previewMyAvatar() {
  const url = couple.me && couple.me.avatar;
  if (!url) return;
  uni.previewImage({ urls: [resolveUrl(url)], current: resolveUrl(url) });
}

function previewPartnerAvatar() {
  const url = couple.partner && couple.partner.avatar;
  if (!url) return;
  uni.previewImage({ urls: [resolveUrl(url)], current: resolveUrl(url) });
}

onShow(() => {
  dishStore.init();
  // 进入个人中心强制刷新情侣资料，确保头像/昵称/配对状态及时互通
  const loadPromise = couple.fetchFromServer(true).catch(() => {});
  if (firstLoading.value) {
    loadPromise.finally(() => {
      firstLoading.value = false;
    });
  }
});

async function onRefresh() {
  refreshing.value = true;
  try {
    await Promise.all([
      couple.fetchFromServer(true),
      dishStore.fetchAll(),
      orderStore.fetchFromServer(true),
      preference.init(),
      addressStore.fetchFromServer(),
    ]);
  } catch (e) {
    // ignore
  } finally {
    refreshing.value = false;
  }
}

// #ifndef MP-WEIXIN
onPullDownRefresh(() => {
  onRefresh().finally(() => {
    uni.stopPullDownRefresh();
  });
});
// #endif
</script>

<style lang="scss" scoped>
.profile-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.nav-title {
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
}
.nav-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(255, 255, 255, 0.35);
  transition: transform 0.15s;
  &:active {
    transform: scale(0.92);
  }
}
.profile-scroll {
  flex: 1;
  height: 0;
}
.demo-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  margin: 20rpx 24rpx 0;
  padding: 16rpx 24rpx;
  background: rgba(232, 184, 108, 0.12);
  border: 1rpx solid rgba(232, 184, 108, 0.35);
  border-radius: $radius-md;
  font-size: 24rpx;
  color: #c98d35;
  .demo-tip { flex: 1; text-align: center; }
  .demo-switch {
    padding: 8rpx 20rpx;
    background: rgba(201, 141, 53, 0.15);
    border-radius: $radius-pill;
    font-size: 22rpx;
    font-weight: 600;
    color: #c98d35;
    &:active { background: rgba(201, 141, 53, 0.3); }
  }
}

/* 情侣卡 */
.couple-card {
  position: relative;
  margin: 20rpx 24rpx 0;
  padding: 36rpx 28rpx 24rpx;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, $brand-primary 0%, $brand-primary-2 100%);
  box-shadow: $shadow-card;
  overflow: hidden;
}
.cc-bg-deco {
  position: absolute;
  top: -40rpx;
  right: -40rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
}
.cc-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cc-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 200rpx;
  position: relative;
  .avatar-wrap {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    overflow: hidden;
  }
  .avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    border: 4rpx solid #fff;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
  }
  .emoji-avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 64rpx;
    border: 4rpx solid #fff;
  }
  .avatar-edit {
    position: absolute;
    right: 30rpx;
    top: 80rpx;
    width: 44rpx;
    height: 44rpx;
    border-radius: 50%;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
  }
  .cc-name {
    margin-top: 12rpx;
    font-size: 28rpx;
    font-weight: 700;
    color: #fff;
  }
  .cc-tag {
    margin-top: 2rpx;
    font-size: 20rpx;
    color: rgba(255, 255, 255, 0.85);
  }
}
.cc-link {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  gap: 6rpx;
  .cc-heart {
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: heartPulse 1.6s ease-in-out infinite;
  }
  .cc-heart-tip {
    margin-top: 4rpx;
    font-size: 18rpx;
    color: rgba(255, 255, 255, 0.85);
    white-space: nowrap;
  }
  @keyframes heartPulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.12);
    }
  }
  .cc-days {
    font-size: 22rpx;
    color: #fff;
    background: rgba(255, 255, 255, 0.25);
    padding: 4rpx 16rpx;
    border-radius: $radius-pill;
  }
  .cc-code {
    font-size: 18rpx;
    color: rgba(255, 255, 255, 0.8);
    &.paired {
      background: rgba(255, 255, 255, 0.25);
      padding: 2rpx 12rpx;
      border-radius: $radius-pill;
    }
    &.copyable {
      display: flex;
      align-items: center;
      gap: 6rpx;
    }
  }
}
/* section */
.section {
  margin: 24rpx 24rpx 0;
}
.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  .sec-head-main {
    display: flex;
    align-items: center;
    gap: 12rpx;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
  .sec-head-right {
    flex-shrink: 0;
    margin-left: 16rpx;
  }
  .sec-title {
    font-size: 32rpx;
    font-weight: 800;
    color: $text-1;
    flex-shrink: 0;
  }
  .sec-sub {
    font-size: 22rpx;
    color: $text-3;
    flex: 1;
    min-width: 0;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sec-more {
    display: flex;
    align-items: center;
    gap: 4rpx;
    padding: 10rpx 0;
    font-size: 24rpx;
    color: var(--c-primary, #f5b6c1);
    font-weight: 600;
    flex-shrink: 0;
  }
}

/* 折叠内容卡片基础 */
.card {
  background: #fff;
  border-radius: $radius-lg;
  padding: 24rpx;
  box-shadow: $shadow-card;
}

/* nut-collapse 全局覆盖见文件底部非 scoped 样式块（兼容小程序虚拟节点） */

/* 折叠展开箭头 */
.sec-arrow {
  flex-shrink: 0;
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;

  .app-icon {
    font-size: 28rpx;
    line-height: 1;
    color: var(--c-primary, #f5b6c1);
  }

  &.expanded {
    transform: rotate(180deg);
  }
}

/* 饮食档案卡 */
.pref-card {
  padding: 8rpx 28rpx;
}
.pref-block {
  padding: 24rpx 0;
  border-bottom: 1rpx solid $divider;
  &:last-child {
    border-bottom: none;
  }
  &.readonly {
    .pb-head {
      .pb-title.danger {
        color: $color-danger;
      }
      .pb-tip.danger {
        color: $color-danger;
      }
    }
  }
  .pb-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16rpx;
    .pb-title-wrap {
      display: flex;
      align-items: baseline;
      gap: 12rpx;
      flex: 1;
      min-width: 0;
    }
    .pb-title {
      font-size: 28rpx;
      font-weight: 700;
      color: $text-1;
    }
    .pb-tip {
      font-size: 22rpx;
      color: $text-3;
    }
    .edit-btn {
      display: flex;
      align-items: center;
      gap: 4rpx;
      padding: 8rpx 18rpx;
      border-radius: $radius-pill;
      background: $bg-surface-alt;
      font-size: 22rpx;
      color: $brand-taro;
      font-weight: 600;
      &.editing {
        background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
        color: #fff;
      }
    }
  }
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.chip {
  padding: 12rpx 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-pill;
  font-size: 24rpx;
  color: $text-2;
  border: 2rpx solid transparent;
  display: flex;
  align-items: center;
  gap: 6rpx;
  &.active {
    background: linear-gradient(135deg, $brand-primary, $brand-primary-2);
    color: #fff;
    font-weight: 600;
    border-color: transparent;
  }
  &.active.danger {
    background: linear-gradient(135deg, $color-danger, #e8a8a8);
  }
  &.active.taro {
    background: linear-gradient(135deg, $brand-taro, $brand-accent);
  }
  &.editing {
    padding-right: 18rpx;
  }
  &.disabled {
    opacity: 0.85;
  }
  .chip-del {
    margin-left: 2rpx;
  }
}
.custom-chip {
  display: flex;
  align-items: center;
  gap: 4rpx;
  .del-icon {
    margin-left: 2rpx;
  }
}
.add-chip {
  display: flex;
  align-items: center;
  gap: 4rpx;
  border: 2rpx dashed $brand-taro;
  background: transparent;
  color: $brand-taro;
  font-size: 24rpx;
}

/* 想吃清单 */
.empty-card {
  padding: 48rpx 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  .ec-icon {
    font-size: 64rpx;
  }
  .ec-text {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-2;
  }
  .ec-sub {
    display: flex;
    align-items: center;
    gap: 6rpx;
    font-size: 22rpx;
    color: $text-4;
  }
}
.fav-grid {
  display: flex;
  flex-direction: column;
}
.fav-card {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $divider;
  transition: background-color 0.2s ease;
  &:last-child {
    border-bottom: none;
  }
  &:active {
    background: $bg-hover;
  }
}

.fav-info {
  flex: 1;
  min-width: 0;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .fav-name {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-1;
  }
  .fav-cat {
    font-size: 22rpx;
    color: $text-3;
  }
}
.fav-fav {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
}

/* 回忆相册 */
.memory-list {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.memory-card {
  padding: 20rpx 0;
  border-bottom: 1rpx solid $divider;
  &:last-child {
    border-bottom: none;
  }
}
.mc-top {
  display: flex;
  align-items: center;
}
.mc-dish-img-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: 12rpx;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  .dish-emoji {
    width: 100%;
    height: 100%;
  }
}
.mc-dish-img {
  width: 100%;
  height: 100%;
}
.mc-thumbs {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.mc-thumb {
  border: 4rpx solid #fff;
  box-sizing: content-box;
  flex-shrink: 0;
}
.mc-info {
  flex: 1;
  min-width: 0;
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .mc-date {
    font-size: 22rpx;
    color: $text-3;
  }
  .mc-items {
    font-size: 26rpx;
    color: $text-1;
    font-weight: 600;
  }
}
.mc-rate {
  margin-top: 16rpx;
  padding-top: 16rpx;
  // border-top: 1rpx solid $divider;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  .mc-stars {
    display: flex;
    gap: 4rpx;
    .mc-star {
      font-size: 28rpx;
      color: $text-4;
      &.active {
        color: $brand-primary;
      }
    }
  }
  .mc-comment {
    font-size: 24rpx;
    color: $text-2;
  }
  .mc-norate {
    font-size: 22rpx;
    color: $text-4;
  }
}

/* 入口卡 */
.entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx;
  background: #fff;
  border-radius: $radius-lg;
  box-shadow: $shadow-card;
  .ec-left {
    display: flex;
    align-items: center;
    gap: 16rpx;
    flex: 1;
    min-width: 0;
    .ec-icon {
      font-size: 40rpx;
      flex-shrink: 0;
    }
    .ec-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4rpx;
      .ec-title {
        font-size: 28rpx;
        font-weight: 700;
        color: $text-1;
      }
      .ec-sub {
        font-size: 22rpx;
        color: $text-3;
      }
    }
  }
}

.foot-tip {
  text-align: center;
  margin: 40rpx 0 20rpx;
  font-size: 22rpx;
  color: $text-4;
}
.tab-holder {
  height: 140rpx;
}

/* 自定义弹层 */
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(74, 40, 60, 0.45);
  display: flex !important;
  align-items: flex-end;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.25s ease-out,
    visibility 0.25s ease-out;
  &.show {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}
.sheet-popup {
  width: 100%;
  background: #fff;
  border-top-left-radius: $radius-xl;
  border-top-right-radius: $radius-xl;
  padding: 32rpx 28rpx;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  transform: translateY(100%);
  transition: transform 0.25s ease-out;
}
.sheet-mask.show .sheet-popup {
  transform: translateY(0);
}
.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.sp-title {
  font-size: 36rpx;
  font-weight: 800;
  color: $text-1;
}
.sp-close {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $bg-surface-alt;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sp-list {
  max-height: 70vh;
  height: 840rpx;
}
.sp-item {
  padding: 28rpx 24rpx;
  border-bottom: 2rpx solid $divider;
  font-size: 30rpx;
  color: $text-1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  &:active {
    background: $bg-hover;
  }
  &:last-child {
    border-bottom: none;
  }
  &.disabled {
    color: $text-4;
    &:active {
      background: transparent;
    }
  }
  .sp-version {
    font-size: 24rpx;
    color: $text-4;
  }
}

/* 服务器地址弹窗 */
.server-popup {
  padding: 32rpx 28rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
.server-body {
  padding: 8rpx 8rpx 32rpx;
}
.server-tip {
  display: block;
  font-size: 24rpx;
  color: $text-3;
  margin-bottom: 20rpx;
}
.server-input {
  width: 100%;
  height: 96rpx;
  padding: 0 24rpx;
  background: $bg-surface-alt;
  border-radius: $radius-md;
  font-size: 30rpx;
  color: $text-1;
  box-sizing: border-box;
}
.server-foot {
  display: flex;
  gap: 20rpx;
  padding: 0 8rpx;
}
.server-btn {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
  &.ghost {
    background: $bg-surface-alt;
    color: $text-2;
  }
  &.primary {
    background: linear-gradient(
      135deg,
      var(--c-primary, $brand-primary),
      var(--c-primary-2, $brand-primary-2)
    );
    color: #fff;
  }
}

/* 版本信息弹窗 */
.about-popup {
  .about-body {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48rpx 40rpx 56rpx;
    .about-logo {
      width: 160rpx;
      height: 160rpx;
      border-radius: 50%;
      background: var(--c-bg-page, $bg-page);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 28rpx;
      box-shadow: $shadow-card;
    }
    .about-name {
      font-size: 40rpx;
      font-weight: 800;
      color: $text-1;
    }
    .about-version {
      margin-top: 12rpx;
      font-size: 26rpx;
      color: $text-3;
    }
    .about-desc {
      margin-top: 24rpx;
      font-size: 28rpx;
      color: $text-2;
    }
    .about-slogan {
      margin-top: 12rpx;
      font-size: 24rpx;
      color: var(--c-primary, $brand-primary);
      font-weight: 600;
    }
  }
  .about-foot {
    padding: 0 32rpx 32rpx;
    .about-btn {
      height: 88rpx;
      border-radius: $radius-pill;
      background: linear-gradient(
        135deg,
        var(--c-primary, $brand-primary),
        var(--c-primary-2, $brand-primary-2)
      );
      color: #fff;
      font-size: 30rpx;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: $shadow-press;
    }
  }
}

/* 页面显示配置弹窗 */
.pc-body {
  padding: 0 8rpx;
}
.pc-tip {
  display: block;
  font-size: 24rpx;
  color: $text-3;
  margin-bottom: 20rpx;
}
.pc-list {
  max-height: 60vh;
}
.pc-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 20rpx;
  border-bottom: 2rpx solid $divider;
  transition: background-color 0.2s ease;
  &:active {
    background: $bg-hover;
  }
  &:last-child {
    border-bottom: none;
  }
  .pc-icon {
    flex-shrink: 0;
  }
  .pc-label {
    flex: 1;
    font-size: 30rpx;
    color: $text-1;
    font-weight: 600;
  }
}
.pc-switch {
  width: 72rpx;
  height: 40rpx;
  border-radius: $radius-pill;
  background: #e0e0e0;
  position: relative;
  transition: background-color 0.25s ease;
  flex-shrink: 0;
  .ps-dot {
    position: absolute;
    top: 4rpx;
    left: 4rpx;
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
    transition: transform 0.25s ease;
  }
  &.on {
    background: var(--c-primary, $brand-primary);
    .ps-dot {
      transform: translateX(32rpx);
    }
  }
}
.pc-foot {
  display: flex;
  gap: 20rpx;
  padding: 24rpx 8rpx 0;
}
.pc-btn {
  flex: 1;
  height: 88rpx;
  border-radius: $radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
  &.ghost {
    background: $bg-surface-alt;
    color: $text-2;
  }
  &.primary {
    background: linear-gradient(
      135deg,
      var(--c-primary, $brand-primary),
      var(--c-primary-2, $brand-primary-2)
    );
    color: #fff;
  }
}
</style>

<!-- #ifdef H5 -->
<style lang="scss" scoped>
::v-deep .profile-collapse-wrap {
  margin: 24rpx 24rpx 0;

  .nut-collapse {
    background: transparent !important;
  }

  .nut-collapse-item {
    background: transparent !important;

    .nut-collapse-item__title {
      padding: 0 !important;
      background: transparent !important;
      min-height: auto !important;

      &::after {
        display: none !important;
      }
    }

    .nut-collapse-item__title-main {
      flex: 1;
      min-width: 0;
    }

    .nut-collapse-item__title-main-value {
      display: block;
    }

    .nut-collapse-item__title-sub {
      display: none !important;
    }

    .nut-collapse-item__title-icon {
      display: none !important;
    }

    .nut-collapse__item-wrapper,
    .nut-collapse__item-extraWrapper {
      background: transparent !important;
      margin: 20rpx 0;
    }

    .nut-collapse__item-wrapper__content,
    .nut-collapse__item-extraWrapper__extraRender {
      padding: 0 !important;
      background: transparent !important;
      font-size: inherit !important;
      line-height: inherit !important;
      color: inherit !important;
    }
  }

  .sec-item + .sec-item {
    margin-top: 24rpx;
  }
}
</style>
<!-- #endif -->
<!-- #ifdef MP-WEIXIN -->
<style lang="scss">
::v-deep .profile-collapse-wrap {
  margin: 24rpx 24rpx 0;

  .nut-collapse {
    background: transparent !important;
  }

  .nut-collapse-item {
    background: transparent !important;

    .nut-collapse-item__title {
      padding: 0 !important;
      background: transparent !important;
      min-height: auto !important;

      &::after {
        display: none !important;
      }
    }

    .nut-collapse-item__title-main {
      flex: 1;
      min-width: 0;
    }

    .nut-collapse-item__title-main-value {
      display: block;
    }

    .nut-collapse-item__title-sub {
      display: none !important;
    }

    .nut-collapse-item__title-icon {
      display: none !important;
    }

    .nut-collapse__item-wrapper,
    .nut-collapse__item-extraWrapper {
      background: transparent !important;
      margin: 20rpx 0;
    }

    .nut-collapse__item-wrapper__content,
    .nut-collapse__item-extraWrapper__extraRender {
      padding: 0 !important;
      background: transparent !important;
      font-size: inherit !important;
      line-height: inherit !important;
      color: inherit !important;
    }
  }

  .sec-item + .sec-item {
    margin-top: 24rpx;
  }
}
</style>
<!-- #endif -->
