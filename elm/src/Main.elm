module Main exposing (main)

import Browser
import Html exposing (Html, button, div, h2, input, textarea, text)
import Html.Attributes exposing (placeholder, readonly, rows, style, value)
import Html.Events exposing (onClick, onInput)
import Http
import Json.Decode as D
import Random
import Char


-- MODEL


type RemoteData e a
    = NotAsked
    | Loading
    | Failure e
    | Success a


type alias Model =
    { words : RemoteData Http.Error (List String)
    , pickedWord : Maybe String
    , defs : RemoteData Http.Error (List String)
    , answer : String
    , lastSubmitted : String
    , isCorrect : Maybe Bool
    , remainingTries : Int
    }


init : () -> ( Model, Cmd Msg )
init _ =
    ( { words = Loading
      , pickedWord = Nothing
      , defs = NotAsked
      , answer = ""
      , lastSubmitted = ""
      , isCorrect = Nothing
      , remainingTries = 3
      }
    , fetchWords
    )



-- MSG


type Msg
    = GotWords (Result Http.Error String)
    | GotRandomIndex Int
    | GotDefinitions (Result Http.Error (List String))
    | AnswerChanged String
    | SubmitAnswer
    | Refresh



-- WORD LIST (TXT)


wordsUrl : String
wordsUrl ="../static/thousand_words_things_explainer.txt"


fetchWords : Cmd Msg
fetchWords =
    Http.get
        { url = wordsUrl
        , expect = Http.expectString GotWords
        }


parseWords : String -> List String
parseWords content =
    content
        |> String.words
        |> List.filter (\w -> String.length w > 0)



-- DICTIONARY API


fetchDefinition : String -> Cmd Msg
fetchDefinition word =
    Http.get
        { url = "https://api.dictionaryapi.dev/api/v2/entries/en/" ++ word
        , expect = Http.expectJson GotDefinitions definitionsDecoder
        }


definitionsDecoder : D.Decoder (List String)
definitionsDecoder =
    D.list entryDecoder
        |> D.map List.concat


entryDecoder : D.Decoder (List String)
entryDecoder =
    D.field "meanings" (D.list meaningDecoder)
        |> D.map List.concat


meaningDecoder : D.Decoder (List String)
meaningDecoder =
    D.field "definitions" (D.list (D.field "definition" D.string))



-- UPDATE


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotWords result ->
            case result of
                Ok content ->
                    let
                        ws =
                            parseWords content

                        maxIndex =
                            List.length ws - 1
                    in
                    if maxIndex < 0 then
                        ( { model | words = Success [] }, Cmd.none )

                    else
                        ( { model | words = Success ws }
                        , Random.generate GotRandomIndex (Random.int 0 maxIndex)
                        )

                Err e ->
                    ( { model | words = Failure e }, Cmd.none )

        GotRandomIndex i ->
            case model.words of
                Success ws ->
                    let
                        w =
                            List.drop i ws |> List.head
                    in
                    case w of
                        Nothing ->
                            ( model, Cmd.none )

                        Just word ->
                            ( { model
                                | pickedWord = Just word
                                , defs = Loading
                              }
                            , fetchDefinition word
                            )

                _ ->
                    ( model, Cmd.none )

        GotDefinitions result ->
            case result of
                Ok ds ->
                    ( { model | defs = Success ds }, Cmd.none )

                Err e ->
                    ( { model | defs = Failure e }, Cmd.none )

        AnswerChanged s ->
            ( { model | answer = s }, Cmd.none )

        SubmitAnswer ->
            let
                isAnswerCorrect =
                    case model.pickedWord of
                        Just w ->
                            String.toLower model.answer == String.toLower w

                        Nothing ->
                            False
                newRemainingTries =
                    if isAnswerCorrect then
                        model.remainingTries
                    else 
                        max 0 (model.remainingTries - 1)
            in
            ( { model
                | lastSubmitted = model.answer
                , isCorrect = Just isAnswerCorrect
                , remainingTries = newRemainingTries
            }
            , Cmd.none
            )

        Refresh ->
            case model.words of
                Success ws ->
                    let
                        maxIndex =
                            List.length ws - 1
                    in
                    if maxIndex < 0 then
                        ( model, Cmd.none )
                    else
                        ( { model
                            | pickedWord = Nothing
                            , defs = NotAsked
                            , answer = ""
                            , lastSubmitted = ""
                            , isCorrect = Nothing
                          }
                        , Random.generate GotRandomIndex (Random.int 0 maxIndex)
                        )

                _ ->
                    ( model, Cmd.none )


-- BOUTON REFRESH
refreshButton : Msg -> Html Msg
refreshButton msg =
    button
        [ onClick msg
        , style "margin-top" "12px"
        , style "background-color" "#333"
        , style "color" "white"
        , style "padding" "10px 16px"
        ]
        [ text "Refresh" ]


maybeRefreshButton : Maybe Msg -> Html Msg
maybeRefreshButton maybeMsg =
    case maybeMsg of
        Just msg ->
            refreshButton msg

        Nothing ->
            text ""
            

-- VIEW

view : Model -> Html Msg
view model =
    div []
        [ h2 [] [ text "Definition:" ]
        , case model.defs of
            Success ds ->
                textarea
                    [ value
                        (ds
                            |> List.indexedMap (\i d -> String.fromInt (i + 1) ++ ". " ++ d)
                            |> String.join "\n"
                        )
                    , readonly True
                    , rows 10
                    , style "width" "100%"
                    , style "box-sizing" "border-box"
                    ]
                    []

            Loading ->
                div [] [ text "Loading definition..." ]

            Failure _ ->
                div [] [ text "Error while fetching definition." ]

            NotAsked ->
                text ""
        , div [ style "margin-top" "16px" ]
            [ h2 [] [ text "Your answer:" ]
            , input
                [ placeholder "Write your answer here"
                , value model.answer
                , onInput AnswerChanged
                , style "padding" "12px"
                , style "box-sizing" "border-box"
                ]
                []
            , button
                [ onClick SubmitAnswer
                , style "margin" "15px 20px"
                , style "background-color" "#333"
                , style "color" "white"
                ]
                [ text "Validate" ]
            , div [ style "margin-top" "12px" ]
                [ text ("Last submitted answer: " ++ model.lastSubmitted) ]
            , viewResult model 
            ]

        ]


viewResult : Model -> Html Msg 
viewResult model =
    case (model.isCorrect, model.remainingTries, model.pickedWord) of
                (Just True,_,_) ->
                    div []
                        [div [ style "color" "green", style "margin-top" "12px" ]
                            [ text "Well done!" ]
                        , div []
                            [ text
                                ("Congratulations! You guessed the word: "
                                    ++ (model.pickedWord |> Maybe.withDefault "")
                                )
                            ]
                        , maybeRefreshButton (Just Refresh)
                        ]
                (Just False, 0, Just word) ->
                    div []
                    [div [ style "color" "red", style "margin-top" "12px" ]
                        [ text ("You lost! The word was: " ++ word) ]
                    , maybeRefreshButton (Just Refresh)
                    ]
                (Just False,_, _) ->
                    div [ style "color" "red", style "margin-top" "12px" ]
                        [ text ("Wrong answer, try again! You still have " ++ String.fromInt model.remainingTries ++ " tries." )]
                        
                _ ->
                    text ""


-- Nettoie et découpe une définition en "mots" (sans ponctuation)
tokenize : String -> List String
tokenize s =
    s
        |> String.toLower
        |> String.map (\c -> if Char.isAlpha c then c else ' ')
        |> String.words


-- Un stemmer simple : gère pluriels + ing/ed + quelques règles courantes
stem : String -> String
stem raw =
    let
        w =
            raw
                |> String.toLower
                |> String.filter Char.isAlpha

        dropSuffix suf str =
            if String.endsWith suf str && String.length str > String.length suf + 2 then
                String.left (String.length str - String.length suf) str
            else
                str

        -- ex: "studies" -> "study"
        fixIes str =
            if String.endsWith "ies" str && String.length str > 4 then
                String.left (String.length str - 3) str ++ "y"
            else
                str

        -- ex: "stopped" -> "stop" (double consonne après retrait)
        undouble str =
            let
                n = String.length str
            in
            if n >= 2 then
                let
                    a = String.slice (n - 1) n str
                    b = String.slice (n - 2) (n - 1) str
                in
                if a == b then
                    String.left (n - 1) str
                else
                    str
            else
                str
    in
    w
        |> fixIes
        |> dropSuffix "ing"
        |> dropSuffix "ed"
        |> dropSuffix "es"
        |> dropSuffix "s"
        |> undouble


-- Vrai si la def contient une forme "proche" du mot (via stem)
isCheatingDefinition : String -> String -> Bool
isCheatingDefinition word def =
    let
        wStem =
            stem word

        tokens =
            tokenize def

        tokenStems =
            List.map stem tokens
    in
    -- si un token a le même stem que le mot, on considère que ça triche
    List.any (\tStem -> tStem /= "" && tStem == wStem) tokenStems


definitionText :
    Maybe String
    -> RemoteData Http.Error (List String)
    -> String
definitionText maybeWord defs =
    case defs of
        NotAsked ->
            "..."

        Loading ->
            "Loading definition..."

        Failure _ ->
            "Error while fetching definition (word not found or API error)."

        Success ds ->
            case maybeWord of
                Nothing ->
                    "..."

                Just word ->
                    let
                        filtered =
                            filterDefinitions word ds
                    in
                    if List.isEmpty filtered then
                        "All definitions contained the word."

                    else
                        filtered
                            |> List.indexedMap (\i d -> String.fromInt (i + 1) ++ ". " ++ d)
                            |> String.join "\n"


filterDefinitions : String -> List String -> List String
filterDefinitions word defs =
    let
        loweredWord =
            String.toLower word
    in
    defs
        |> List.filter
            (\d ->
                not
                    (String.contains loweredWord (String.toLower d))
            )



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none



-- MAIN


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , view = view
        , subscriptions = subscriptions
        }
