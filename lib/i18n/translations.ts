export const translations = {
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      back: "Back",
      loading: "Loading...",
      search: "Search",
      country: "Country",
      city: "City",
      yes: "Yes",
      no: "No",
      publish: "Publish",
      draft: "Draft",
      premium: "Premium",
    },

    navigation: {
      marketplace: "Marketplace",
      feed: "Feed",
      messages: "Messages",
      sell: "Sell",
      store: "Store",
      myPage: "My page",
    },

    sellPage: {
      createListing: "Create listing",
      takePhoto: "Take photo",
      chooseFromGallery: "Choose from gallery",
      analyzePhotos: "Analyze photos with AI",
      title: "Title",
      description: "Description",
      price: "Price",
      publish: "Publish",
      saving: "Saving...",
      country: "Country",
      city: "City",
      categorySpecificDetails: "Category specific details",
      suggestedImprovements: "Suggested improvements",
      noStoreSection: "No store section",
      new: "New",
      used: "Used",
      forParts: "For parts",
    },

    marketplace: {
      filters: "Filters",
      browseMarketplace: "Browse marketplace",
      resetFilters: "Reset filters",
      searchListings: "Search listings...",
      priceFrom: "Price from",
      priceTo: "Price to",
      searchNearCity: "Search near city...",
      near: "Near",
      nearYou: "Near you",
      moreFilters: "More filters",
      hideMoreFilters: "Hide more filters",
      allCategories: "All categories",
      allSubcategories: "All subcategories",
      allDetailedCategories: "All detailed categories",
      allConditions: "All conditions",
      listings: "Listings",
      latestItems: "Latest items",
      shown: "shown",
      loadingMarketplace: "Loading marketplace...",
      noMatchingListings: "No matching listings",
      tryChangingFilters: "Try changing your filters or search term.",
      loadMore: "Load more",
      loading: "Loading...",
    },

    listing: {
      premium: "Premium",
      store: "Store",
      noStore: "No store",
      sellerStore: "Seller store",
      noCountry: "No country",
      general: "General",
    },

    condition: {
      new: "New",
      used: "Used",
      for_parts: "For parts",
    },
  },

  et: {
    common: {
      save: "Salvesta",
      cancel: "Tühista",
      back: "Tagasi",
      loading: "Laen...",
      search: "Otsi",
      country: "Riik",
      city: "Linn",
      yes: "Jah",
      no: "Ei",
      publish: "Avalda",
      draft: "Mustand",
      premium: "Premium",
    },

    navigation: {
      marketplace: "Turg",
      feed: "Uudised",
      messages: "Sõnumid",
      sell: "Müü",
      store: "Pood",
      myPage: "Minu leht",
    },

    sellPage: {
      createListing: "Loo kuulutus",
      takePhoto: "Tee foto",
      chooseFromGallery: "Vali galeriist",
      analyzePhotos: "Analüüsi fotosid AI abil",
      title: "Pealkiri",
      description: "Kirjeldus",
      price: "Hind",
      publish: "Avalda",
      saving: "Salvestan...",
      country: "Riik",
      city: "Linn",
      categorySpecificDetails: "Rubriigi täpsustavad andmed",
      suggestedImprovements: "Soovitatud parandused",
      noStoreSection: "Poe sektsioon puudub",
      new: "Uus",
      used: "Kasutatud",
      forParts: "Varuosadeks",
    },

    marketplace: {
      filters: "Filtrid",
      browseMarketplace: "Sirvi turgu",
      resetFilters: "Lähtesta filtrid",
      searchListings: "Otsi kuulutusi...",
      priceFrom: "Hind alates",
      priceTo: "Hind kuni",
      searchNearCity: "Otsi linna lähedalt...",
      near: "Lähedal",
      nearYou: "Sinu lähedal",
      moreFilters: "Rohkem filtreid",
      hideMoreFilters: "Peida lisafiltrid",
      allCategories: "Kõik rubriigid",
      allSubcategories: "Kõik alamrubriigid",
      allDetailedCategories: "Kõik detailrubriigid",
      allConditions: "Kõik seisukorrad",
      listings: "Kuulutused",
      latestItems: "Viimased kuulutused",
      shown: "näidatud",
      loadingMarketplace: "Laen turgu...",
      noMatchingListings: "Sobivaid kuulutusi ei leitud",
      tryChangingFilters: "Proovi muuta filtreid või otsingusõna.",
      loadMore: "Laadi rohkem",
      loading: "Laen...",
    },

    listing: {
      premium: "Premium",
      store: "Pood",
      noStore: "Pood puudub",
      sellerStore: "Müüja pood",
      noCountry: "Riik puudub",
      general: "Üldine",
    },

    condition: {
      new: "Uus",
      used: "Kasutatud",
      for_parts: "Varuosadeks",
    },
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey =
  | `common.${keyof typeof translations.en.common}`
  | `navigation.${keyof typeof translations.en.navigation}`
  | `sellPage.${keyof typeof translations.en.sellPage}`
  | `marketplace.${keyof typeof translations.en.marketplace}`
  | `listing.${keyof typeof translations.en.listing}`
  | `condition.${keyof typeof translations.en.condition}`;
