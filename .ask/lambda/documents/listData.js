/*jshint esversion: 8 */

exports.powersListMainData = async(handlerInput) => {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    var attributes = await getAttributes(handlerInput);
  
  var theListData = {
    "listTemplate2Metadata": {
        "type": "object",
        "objectId": "lt1Metadata",
        "backgroundImage": {
            "contentDescription": null,
            "smallSourceUrl": null,
            "largeSourceUrl": null,
            "sources": [
                {
                    "url": "https://powers.s3.amazonaws.com/arches-architecture-art-baroque-316080.jpg",
                    "size": "small",
                    "widthPixels": 0,
                    "heightPixels": 0
                },
                {
                    "url": "https://powers.s3.amazonaws.com/arches-architecture-art-baroque-316080.jpg",
                    "size": "large",
                    "widthPixels": 0,
                    "heightPixels": 0
                }
            ]
        },
        "title": "Select your Power Character",
        "logoUrl": "https://d2o906d8ln7ui1.cloudfront.net/images/cheeseskillicon.png"
    },
    "listTemplate2ListData": {
        "type": "list",
        "listId": "lt2Sample",
        "totalNumberOfItems": 9,
        "hintText": "Tap on your character or Say their name.",
        "listPage": {
            "listItems": [
            {
                "listItemIdentifier": "SharpieSharp",
                "ordinalNumber": 4,
                "textContent": {
                    "primaryText": {
                        "type": "PlainText",
                        "text": "Sharpie Sharp"
                    },
                    "secondaryText": {
                        "type": "PlainText",
                        "text": "Power: Spike Throw"
                    },
                    "thirdText": {
                      "type": "PlainText",
                      "text": attributes.characters["Sharpie Sharp"].charLevel
                    }
                },
                "image": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/matteo-di-iorio-wkMd_DylG8I-unsplash.jpg",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/matteo-di-iorio-wkMd_DylG8I-unsplash.jpg",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "image2": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/SharpySharp.png",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/SharpySharp.png",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "token": "Sharpie Sharp"
            },
            {
                "listItemIdentifier": "Randell",
                "ordinalNumber": 2,
                "textContent": {
                    "primaryText": {
                        "type": "PlainText",
                        "text": "Randell"
                    },
                    "secondaryText": {
                        "type": "PlainText",
                        "text": "Power: Bone Breaker"
                    },
                    "thirdText": {
                      "type": "PlainText",
                      "text": attributes.characters.Randell.charLevel
                    }
                },
                "image": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/omid-armin-2GHCdtW45Uw-unsplash.jpg",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/omid-armin-2GHCdtW45Uw-unsplash.jpg",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "image2": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/Randell.png",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/Randell.png",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "token": "Randell"
            },
            {
                "listItemIdentifier": "Lillith",
                "ordinalNumber": 1,
                "textContent": {
                    "primaryText": {
                        "type": "PlainText",
                        "text": "Lillith"
                    },
                    "secondaryText": {
                        "type": "PlainText",
                        "text": "Power: Poison Spray"
                    },
                    "thirdText": {
                      "type": "PlainText",
                      "text": attributes.characters.Lillith.charLevel
                    }
                },
                "image": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/samy-saadi-fFC7IOFT-OM-unsplash.jpg",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/samy-saadi-fFC7IOFT-OM-unsplash.jpg",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "image2": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/Lillith.png",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/Lillith.png",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "token": "Lillith"
            },
            {
                "listItemIdentifier": "Argus",
                "ordinalNumber": 7,
                "textContent": {
                    "primaryText": {
                        "type": "PlainText",
                        "text": "Argus"
                    },
                    "secondaryText": {
                        "type": "PlainText",
                        "text": "Power: Hand Beam Cannons"
                    },
                    "thirdText": {
                      "type": "PlainText",
                      "text": attributes.characters.Argus.charLevel
                    }
                },
                "image": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/david-bruyndonckx-F_hft1Wiyj8-unsplash.jpg",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/david-bruyndonckx-F_hft1Wiyj8-unsplash.jpg",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "image2": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/Argus.png",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/Argus.png",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "token": "Argus"
            },
            {
                "listItemIdentifier": "Charity",
                "ordinalNumber": 3,
                "textContent": {
                    "primaryText": {
                        "type": "PlainText",
                        "text": "Charity"
                    },
                    "secondaryText": {
                        "type": "PlainText",
                        "text": "Power: Heel Stomp"
                    },
                    "thirdText": {
                      "type": "PlainText",
                      "text": attributes.characters.Charity.charLevel
                    }
                },
                "image": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/efe-kurnaz-RnCPiXixooY-unsplash.jpg",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/efe-kurnaz-RnCPiXixooY-unsplash.jpg",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "image2": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/Charity.png",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/Charity.png",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "token": "Charity"
            },
            {
                "listItemIdentifier": "ElectricMean",
                "ordinalNumber": 9,
                "textContent": {
                    "primaryText": {
                        "type": "PlainText",
                        "text": "Electric Mean"
                    },
                    "secondaryText": {
                        "type": "PlainText",
                        "text": "Power: Heel Stomp"
                    },
                    "thirdText": {
                      "type": "PlainText",
                      "text": attributes.characters["Electric Mean"].charLevel
                    }
                },
                "image": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/maarten-van-den-heuvel-Siuwr3uCir0-unsplash.jpg",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/maarten-van-den-heuvel-Siuwr3uCir0-unsplash.jpg",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "image2": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/ElectricMean.png",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/ElectricMean.png",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "token": "Electric Mean"
            },
            {
                "listItemIdentifier": "Karrigan",
                "ordinalNumber": 8,
                "textContent": {
                    "primaryText": {
                        "type": "PlainText",
                        "text": "Karrigan"
                    },
                    "secondaryText": {
                        "type": "PlainText",
                        "text": "Power: Stone Throw"
                    },
                    "thirdText": {
                      "type": "PlainText",
                      "text": attributes.characters.Karrigan.charLevel
                    }
                },
                "image": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/carles-rabada-gwwWhABtohs-unsplash.jpg",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/carles-rabada-gwwWhABtohs-unsplash.jpg",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "image2": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/Karrigan.png",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/Karrigan.png",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "token": "Karrigan"
            },
            {
                "listItemIdentifier": "Edge",
                "ordinalNumber": 6,
                "textContent": {
                    "primaryText": {
                        "type": "PlainText",
                        "text": "Edge"
                    },
                    "secondaryText": {
                        "type": "PlainText",
                        "text": "Power: Speed Attack"
                    },
                    "thirdText": {
                      "type": "PlainText",
                      "text": attributes.characters.Edge.charLevel
                    }
                },
                "image": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/deglee-degi-wQImoykAwGs-unsplash.jpg",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/deglee-degi-wQImoykAwGs-unsplash.jpg",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "image2": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/Edge.png",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/Edge.png",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "token": "Edge"
            },
            {
                "listItemIdentifier": "LarsThundersquat",
                "ordinalNumber": 5,
                "textContent": {
                    "primaryText": {
                        "type": "PlainText",
                        "text": "Lars Thundersquat"
                    },
                    "secondaryText": {
                        "type": "PlainText",
                        "text": "Power: Thigh Crusher"
                    },
                    "thirdText": {
                      "type": "PlainText",
                      "text": attributes.characters["Lars Thundersquat"].charLevel
                    }
                },
                "image": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/michael-shannon-iIrB37J5yfA-unsplash.jpg",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/michael-shannon-iIrB37J5yfA-unsplash.jpg",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "image2": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://powers.s3.amazonaws.com/LarsThundersquat.png",
                            "size": "small",
                            "widthPixels": 0,
                            "heightPixels": 0
                        },
                        {
                            "url": "https://powers.s3.amazonaws.com/LarsThundersquat.png",
                            "size": "large",
                            "widthPixels": 0,
                            "heightPixels": 0
                        }
                    ]
                },
                "token": "Lars Thundersquat"
            }    
            
        ]
        }
    }
  };
  
  return theListData;
  };